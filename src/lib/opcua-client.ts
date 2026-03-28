/**
 * Server-side OPC UA 클라이언트 싱글턴
 *
 * Next.js Route Handler에서 import하여 사용.
 * 연결이 끊어지면 자동 재연결을 시도한다.
 */
import {
  OPCUAClient,
  ClientSession,
  DataType,
  AttributeIds,
  ReadValueIdOptions,
  StatusCodes,
  MessageSecurityMode,
  SecurityPolicy,
} from "node-opcua-client";
import { collectAllNodeIds, OPCUA_NODES } from "./opcua-nodes";
import { getSiteConfig } from "./site-config";

// ─── 싱글턴 상태 ─────────────────────────────────────────────────────────────

let client: OPCUAClient | null = null;
let session: ClientSession | null = null;
let connecting: Promise<ClientSession> | null = null;

/** nodeId → 최근 읽은 값 캐시 */
const valueCache = new Map<string, number | boolean | string | null>();

// ─── 연결 ────────────────────────────────────────────────────────────────────

/** 타임아웃 부여 wrapper — 지정 시간 내 resolve 안 되면 reject */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[OPC UA] ${label} timed out (${ms}ms)`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/** 기존 client/session을 안전하게 정리 (5초 타임아웃) */
async function cleanup(): Promise<void> {
  const s = session;
  const c = client;
  session = null;
  client = null;
  connecting = null;

  if (s) {
    try { await withTimeout(s.close(), 5000, "session.close"); } catch { /* ignore */ }
  }
  if (c) {
    try { await withTimeout(c.disconnect(), 5000, "client.disconnect"); } catch { /* ignore */ }
  }
}

async function doConnect(): Promise<ClientSession> {
  // 이전 연결이 남아있으면 먼저 정리
  await cleanup();

  const newClient = OPCUAClient.create({
    applicationName: "NODI-DC-EMS",
    connectionStrategy: {
      initialDelay: 1000,
      maxRetry: 3,
      maxDelay: 5000,
    },
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    endpointMustExist: false,
    requestedSessionTimeout: 60000,
    keepSessionAlive: true,
  });

  newClient.on("connection_lost", () => {
    console.warn("[OPC UA] connection lost — will reconnect on next request");
    session = null;
    // client는 유지 — ensureConnected에서 cleanup 후 재연결
  });

  const endpoint = getSiteConfig().opcua.endpoint;
  await withTimeout(newClient.connect(endpoint), 10000, "connect");
  const newSession = await withTimeout(newClient.createSession(), 10000, "createSession");

  client = newClient;
  session = newSession;
  console.log("[OPC UA] connected to", endpoint);
  return newSession;
}

async function ensureConnected(): Promise<ClientSession> {
  // 기존 세션이 살아있으면 재사용
  if (session) return session;

  // 이미 연결 시도 중이면 동일 Promise 공유 (중복 연결 방지)
  if (connecting) {
    try {
      return await connecting;
    } catch {
      // 진행 중이던 연결이 실패했으면 아래에서 새로 시도
    }
  }

  // 새 연결 시도 — Promise를 공유하여 동시 요청이 같은 연결을 기다리도록
  connecting = doConnect().finally(() => { connecting = null; });

  try {
    return await connecting;
  } catch (err) {
    console.error("[OPC UA] connection failed:", err);
    await cleanup();
    throw err;
  }
}

// ─── 프로세스 종료 시 깨끗하게 정리 ──────────────────────────────────────────

// HMR 중복 등록 방지를 위해 글로벌 플래그 사용
const globalObj = globalThis as unknown as { __opcua_exit_registered?: boolean };
if (!globalObj.__opcua_exit_registered && typeof process !== "undefined") {
  globalObj.__opcua_exit_registered = true;
  const onExit = () => { cleanup().catch(() => {}); };
  process.on("SIGINT", onExit);
  process.on("SIGTERM", onExit);
  process.on("beforeExit", onExit);
}

// ─── 일괄 읽기 ───────────────────────────────────────────────────────────────

export async function readAllNodes(): Promise<Record<string, number | boolean | string | null>> {
  const allNodeIds = collectAllNodeIds(OPCUA_NODES);

  try {
    const sess = await ensureConnected();

    const nodesToRead: ReadValueIdOptions[] = allNodeIds.map((nodeId) => ({
      nodeId,
      attributeId: AttributeIds.Value,
    }));

    const results = await sess.read(nodesToRead);

    for (let i = 0; i < allNodeIds.length; i++) {
      const dv = results[i];
      if (dv.statusCode.equals(StatusCodes.Good)) {
        const raw = dv.value?.value;
        valueCache.set(allNodeIds[i], raw ?? null);
      } else {
        valueCache.set(allNodeIds[i], null);
      }
    }
    lastReadOk = true;
  } catch (err) {
    console.error("[OPC UA] read error:", err);
    lastReadOk = false;
    // 연결 끊어졌을 수 있으니 전체 정리 (다음 호출 시 재연결)
    await cleanup();
    // 캐시된 값은 그대로 유지 (마지막 좋은 값)
  }

  // nodeId → value 맵 반환
  const result: Record<string, number | boolean | string | null> = {};
  for (const id of allNodeIds) {
    result[id] = valueCache.get(id) ?? null;
  }
  return result;
}

/** 마지막 읽기 성공 여부 */
let lastReadOk = false;

/** OPC UA 연결 상태 (마지막 읽기 기준) */
export function isConnected(): boolean {
  return lastReadOk;
}

// ─── 단건 쓰기 (설정값 저장용) ───────────────────────────────────────────────

export async function writeNode(
  nodeId: string,
  value: number | boolean | string,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  try {
    const sess = await ensureConnected();

    // OPC UA 서버의 노드 데이터 타입이 모두 String
    const status = await sess.write({
      nodeId,
      attributeId: AttributeIds.Value,
      value: {
        value: {
          dataType: DataType.String,
          value: String(value),
        },
      },
    });

    console.log(`[OPC UA] write ${nodeId} = "${value}" → ${status.name}`);

    if (status.equals(StatusCodes.Good)) {
      return { ok: true };
    }
    return { ok: false, status: status.name };
  } catch (err) {
    console.error("[OPC UA] write error:", err);
    await cleanup();
    return { ok: false, error: String(err) };
  }
}

// ─── 종료 ────────────────────────────────────────────────────────────────────

export async function disconnect(): Promise<void> {
  await cleanup();
}

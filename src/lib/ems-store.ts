"use client";

import { create } from "zustand";

// ─── 데이터 타입 (API 응답과 동일) ───────────────────────────────────────────

export interface DataItem {
  tag: string;
  label: string;
  unit: string;
  val: number | boolean | string | null;
}

export interface ConverterData {
  ac: DataItem[];
  dc: DataItem[];
  energy: DataItem[];
  temp: DataItem[];
  alarm: DataItem[];
}

export interface StackData {
  name: string;
  rated: number | null;
  used: number | null;
}

export interface EmsData {
  converters: {
    conv0: ConverterData;
    conv1: ConverterData;
    conv2: ConverterData;
    conv3: ConverterData;
  };
  dashboard: {
    reduction_energy: number | null;
    reduction_carbon: number | null;
    reduction_energy_cost: number | null;
    reduction_carbon_cost: number | null;
    dc_eff: number | null;
    ac_eff: number | null;
  };
  efficiency: {
    dc: {
      conv_in_p: number | null;
      conv_in_v: number | null;
      conv_eff: number | null;
      conv_out_p: number | null;
      conv_out_v: number | null;
      smps_eff: number | null;
      smps_out_p: number | null;
      total_eff: number | null;
    };
    ac: {
      tr_in_p: number | null;
      tr_in_v: number | null;
      tr_eff: number | null;
      tr_out_p: number | null;
      tr_out_v: number | null;
      smps_eff: number | null;
      smps_out_p: number | null;
      total_eff: number | null;
    };
  };
  supply: {
    total_rated: number | null;
    total_used: number | null;
    reserve_margin: number | null;
    stacks: StackData[];
  };
  quality: {
    ac_voltage: number | null;
    ac_v_diff: number | null;
    ac_v_diff_yesterday: number | null;
    dc_voltage: number | null;
    dc_v_diff: number | null;
    dc_v_diff_yesterday: number | null;
    ac_v_swing_yesterday: number | null;
    dc_v_swing_yesterday: number | null;
    pf: number | null;
    v_unbal: number | null;
  };
  settings: Record<string, number | null>;
  _ts: number;
  _connected: boolean;
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface EmsStore {
  data: EmsData | null;
  loading: boolean;
  error: string | null;
  /** 폴링 활성 여부 */
  _polling: boolean;
  /** 데이터 1회 fetch */
  fetch: () => Promise<void>;
  /** 폴링 시작 (ms 간격) */
  startPolling: (intervalMs?: number) => void;
  /** 폴링 중지 */
  stopPolling: () => void;
}

/** fetch 중복 방지 플래그 */
let fetching = false;

/** 폴링 타이머 ID */
let timerId: ReturnType<typeof setTimeout> | null = null;

/** visibility change 핸들러 등록 여부 */
let visibilityHandlerRegistered = false;

export const useEmsStore = create<EmsStore>((set, get) => {
  async function doFetch() {
    if (fetching) return; // 이전 fetch가 아직 진행 중
    fetching = true;
    set({ loading: true });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
      const res = await fetch("/api/ems/data", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EmsData = await res.json();
      set({ data, error: data._connected === false ? "OPC UA 연결 끊김" : null });
    } catch (err) {
      // 에러 시에도 기존 데이터 유지, error만 설정
      set({ error: String(err) });
    } finally {
      fetching = false;
      set({ loading: false });
    }
  }

  function scheduleNext(intervalMs: number) {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(async () => {
      if (!get()._polling) return;
      await doFetch();
      if (get()._polling) scheduleNext(intervalMs);
    }, intervalMs);
  }

  return {
    data: null,
    loading: false,
    error: null,
    _polling: false,

    fetch: doFetch,

    startPolling: (intervalMs = 2000) => {
      if (get()._polling) return;
      set({ _polling: true });
      doFetch(); // 즉시 1회

      // setTimeout 체이닝 (setInterval 대신 — 이전 fetch 완료 후 다음 예약)
      scheduleNext(intervalMs);

      // 브라우저 탭 복귀 시 즉시 fetch + 폴링 재개
      if (!visibilityHandlerRegistered && typeof document !== "undefined") {
        visibilityHandlerRegistered = true;
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible" && get()._polling) {
            doFetch(); // 탭 복귀 시 즉시 갱신
            scheduleNext(intervalMs);
          }
        });
      }
    },

    stopPolling: () => {
      set({ _polling: false });
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    },
  };
});

// ─── 숫자 포맷 헬퍼 ─────────────────────────────────────────────────────────

/** null이면 "-" 반환, 아니면 지정 소수점으로 포맷 */
export function fmt(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return "-";
  return Number(val).toFixed(decimals);
}

/** W 단위를 kW로 변환하여 포맷 */
export function fmtKw(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return "-";
  return (Number(val) / 1000).toFixed(decimals);
}

/** boolean/숫자를 ON/OFF로 변환 */
export function fmtBool(val: number | boolean | string | null): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "boolean") return val ? "ON" : "OFF";
  if (typeof val === "number") return val ? "ON" : "OFF";
  return String(val);
}

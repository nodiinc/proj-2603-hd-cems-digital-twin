import { InfluxDB } from "influx";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * 사이트 설정에서 InfluxDB 클라이언트를 생성한다.
 * InfluxDB에 KST 타임스탬프가 UTC로 저장되어 있음.
 * now() 는 실제 UTC이므로 타임존 오프셋만큼 보정하여 조회한다.
 */
function getInfluxClient(siteId?: number) {
  const cfg = getSiteConfig(siteId);
  const db = cfg.influxdb;
  const influx = new InfluxDB({
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
  });
  const offset = db.timezoneOffsetHours;
  const timeRange = `time > now() + ${offset}h - 24h AND time < now() + ${offset}h`;
  const measurement = db.measurement;
  const retentionPolicy = db.retentionPolicy;
  return { influx, timeRange, measurement, retentionPolicy };
}

/** 두 시계열을 시간 기준으로 병합, val을 float 파싱 */
function mergeTimeSeries(
  aRows: any[],
  bRows: any[],
  aKey: string,
  bKey: string,
) {
  const aMap = new Map<number, number>();
  for (const r of aRows) {
    const v = parseFloat(r.val);
    if (!isNaN(v)) aMap.set(new Date(r.time).getTime(), v);
  }
  const bMap = new Map<number, number>();
  for (const r of bRows) {
    const v = parseFloat(r.val);
    if (!isNaN(v)) bMap.set(new Date(r.time).getTime(), v);
  }
  const allTimes = [...new Set([...aMap.keys(), ...bMap.keys()])].sort();
  return allTimes.map((ts) => {
    const d = new Date(ts);
    // 저장된 타임스탬프가 KST이므로 UTC 메서드로 읽으면 KST 시각이 됨
    return {
      t: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
      [aKey]: aMap.get(ts) ?? null,
      [bKey]: bMap.get(ts) ?? null,
    };
  });
}

/**
 * GET /api/ems/history?type=efficiency|voltage|voltage_diff&siteId=100
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const siteId = url.searchParams.get("siteId") ?? undefined;

  const { influx, timeRange, measurement, retentionPolicy } = getInfluxClient(
    siteId ? Number(siteId) : undefined,
  );
  const cfg = getSiteConfig(siteId ? Number(siteId) : undefined);
  const ns = cfg.opcua.namespace.replace("ns=1;s=", "");

  function q(k: string) {
    return `
      SELECT last(v) AS val FROM "${retentionPolicy}"."${measurement}"
      WHERE k = '${k}' AND ${timeRange}
      GROUP BY time(10m) fill(none)
    `;
  }

  try {
    if (type === "efficiency") {
      const [dcRows, acRows] = await Promise.all([
        influx.query(q(`${ns}/calc/simul_dc/self/conv_eff`)),
        influx.query(q(`${ns}/calc/simul_ac/self/conv_eff`)),
      ]);
      return Response.json({ data: mergeTimeSeries(dcRows, acRows, "dc", "ac") });
    }

    if (type === "voltage") {
      const [acRows, dcRows] = await Promise.all([
        influx.query(q(`${ns}/base/dc_conv_0/ac_in/v`)),
        influx.query(q(`${ns}/base/dc_conv_0/dc_out/v`)),
      ]);
      return Response.json({ data: mergeTimeSeries(acRows, dcRows, "ac", "dc") });
    }

    if (type === "voltage_diff") {
      const [acRows, dcRows] = await Promise.all([
        influx.query(q(`${ns}/base/dc_conv_0/ac_in/v_diff`)),
        influx.query(q(`${ns}/calc/dc_conv_0/dc_out/v_diff_yesterday`)),
      ]);
      return Response.json({ data: mergeTimeSeries(acRows, dcRows, "ac", "dc") });
    }

    return Response.json({ error: "type 파라미터 필요 (efficiency | voltage | voltage_diff)" }, { status: 400 });
  } catch (err) {
    console.error("[API /ems/history] error:", err);
    return Response.json({ error: "InfluxDB 조회 실패", detail: String(err) }, { status: 503 });
  }
}

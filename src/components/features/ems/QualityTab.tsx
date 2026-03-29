"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CARD_BG, BORDER, TEXT_PRIMARY, TEXT_LABEL, TEXT_UNIT, SECTION_BORDER, tooltipStyle } from "@/lib/ems-data";
import { useEmsStore, fmt } from "@/lib/ems-store";
import { useEffect, useState } from "react";

interface HistoryPoint {
  t: string;
  ac: number | null;
  dc: number | null;
}

function useHistory(type: string) {
  const [data, setData] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/ems/history?type=${type}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json.data ?? []);
      } catch { /* ignore */ }
    }
    load();
    const iv = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [type]);

  return data;
}

/** Y축 domain + ticks 배열을 동적으로 계산 (1/2/5/10/20/50... 단위, 8개 미만, 위아래 1틱 여유) */
function calcYAxis(data: HistoryPoint[], keys: ("dc" | "ac")[]): { domain: [number, number]; ticks: number[] } {
  const vals = data.flatMap((d) => keys.map((k) => d[k]).filter((v): v is number => v != null));
  if (vals.length === 0) return { domain: [0, 100], ticks: [0, 20, 40, 60, 80, 100] };
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const range = rawMax - rawMin || 1;
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  let step = 1;
  for (const s of steps) {
    if (Math.ceil(range / s) + 1 + 2 <= 8) { step = s; break; } // +2 for padding, <8 ticks
  }
  const min = Math.floor(rawMin / step) * step - step; // 1틱 아래 여유
  const max = Math.ceil(rawMax / step) * step + step;  // 1틱 위 여유
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) ticks.push(v);
  return { domain: [min, max], ticks };
}

/** 짝수 정각(2시간 간격)만 라벨+눈금 표시하는 커스텀 tick */
function HourlyTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  const t = payload.value;
  if (!t.endsWith(":00")) return null;
  const h = parseInt(t.split(":")[0], 10);
  if (h % 2 !== 0) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={-y} x2={0} y2={0} stroke="#2e3a56" strokeDasharray="3 3" />
      <text x={0} y={12} textAnchor="middle" fill="#a8b2c8" fontSize={11}>{t}</text>
    </g>
  );
}

export default function QualityTab() {
  const q = useEmsStore((s) => s.data?.quality);
  const voltageHistory = useHistory("voltage");
  const diffHistory = useHistory("voltage_diff");

  // 편차 비교: 값이 작을수록 우월
  const diffPairs = [
    { dc: q?.dc_v_diff, ac: q?.ac_v_diff },
    { dc: q?.dc_v_diff_yesterday, ac: q?.ac_v_diff_yesterday },
    { dc: q?.dc_v_swing_yesterday, ac: q?.ac_v_swing_yesterday },
  ];

  type Metric = { label: string; val: string; unit: string; compare?: "win" | "lose" | null; diff?: string };

  function compareTag(dcVal: number | null | undefined, acVal: number | null | undefined, side: "dc" | "ac"): { compare: "win" | "lose" | null; diff: string } {
    if (dcVal == null || acVal == null) return { compare: null, diff: "" };
    const better = dcVal <= acVal ? "dc" : "ac";
    const pct = acVal !== 0 ? Math.abs(((acVal - dcVal) / acVal) * 100) : 0;
    return {
      compare: side === better ? "win" : "lose",
      diff: side === "dc" && better === "dc" ? `▼ ${fmt(pct, 1)}%` : side === "ac" && better === "ac" ? `▼ ${fmt(pct, 1)}%` : "",
    };
  }

  const dcMetrics: Metric[] = [
    { label: "컨버터 전압", val: fmt(q?.dc_voltage), unit: "V" },
    { label: "컨버터 전압 편차", val: fmt(q?.dc_v_diff), unit: "V", ...compareTag(diffPairs[0].dc, diffPairs[0].ac, "dc") },
    { label: "어제 최대 컨버터 전압 편차", val: fmt(q?.dc_v_diff_yesterday), unit: "V", ...compareTag(diffPairs[1].dc, diffPairs[1].ac, "dc") },
  ];
  const acMetrics: Metric[] = [
    { label: "변압기 전압 (가상)", val: fmt(q?.ac_voltage), unit: "V" },
    { label: "변압기 전압 편차 (가상)", val: fmt(q?.ac_v_diff), unit: "V", ...compareTag(diffPairs[0].dc, diffPairs[0].ac, "ac") },
    { label: "어제 최대 변압기 전압 편차 (가상)", val: fmt(q?.ac_v_diff_yesterday), unit: "V", ...compareTag(diffPairs[1].dc, diffPairs[1].ac, "ac") },
  ];
  const gridMetrics = [
    { label: "계통 전압 불평형률", val: q?.v_unbal != null ? fmt(q.v_unbal) : "-", unit: "%" },
    { label: "계통 역률", val: q?.pf != null ? fmt(q.pf) : "-", unit: "" },
  ];

  const vAxis = calcYAxis(voltageHistory, ["ac", "dc"]);
  const diffAxis = calcYAxis(diffHistory, ["ac", "dc"]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 전력 현황 */}
      <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 12 }}>전력 현황</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { label: "컨버터 DC 전압 (실제)", val: fmt(q?.dc_voltage), unit: "VDC", valColor: "#0ea5e9" },
            { label: "변압기 AC 전압 (가상)", val: fmt(q?.ac_voltage), unit: "VAC", valColor: "#f59e0b" },
            { label: "계통 전압 불평형률", val: q?.v_unbal != null ? fmt(q.v_unbal) : "-", unit: "%", valColor: "#fff" },
            { label: "계통 역률", val: q?.pf != null ? fmt(q.pf) : "-", unit: "", valColor: "#fff" },
          ].map((m) => (
            <div key={m.label} style={{ padding: 12, borderRadius: 6, background: "#1a2038", border: `1px solid ${BORDER}40` }}>
              <p style={{ fontSize: 11, color: TEXT_LABEL, marginBottom: 4 }}>{m.label}</p>
              <p style={{ fontSize: 20, fontWeight: 600, color: m.valColor }}>
                {m.val} <span style={{ fontSize: 11, color: TEXT_UNIT }}>{m.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* DC vs. AC 전력 품질 비교 */}
      <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 12 }}>DC vs. AC 전력 품질 비교</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { dcLabel: "실시간 컨버터 DC 전압 편차", dcVal: fmt(q?.dc_v_diff), acLabel: "실시간 변압기 AC 전압 편차", acVal: fmt(q?.ac_v_diff), ...compareTag(diffPairs[0].dc, diffPairs[0].ac, "dc") },
            { dcLabel: "어제 컨버터 DC 최대 전압 편차", dcVal: fmt(q?.dc_v_diff_yesterday), acLabel: "어제 변압기 AC 최대 전압 편차", acVal: fmt(q?.ac_v_diff_yesterday), ...compareTag(diffPairs[1].dc, diffPairs[1].ac, "dc") },
            { dcLabel: "어제 컨버터 DC 전압 변동폭", dcVal: fmt(q?.dc_v_swing_yesterday), acLabel: "어제 변압기 AC 전압 변동폭", acVal: fmt(q?.ac_v_swing_yesterday), ...compareTag(diffPairs[2].dc, diffPairs[2].ac, "dc") },
          ].map((pair) => (
            <div
              key={pair.dcLabel}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: 10,
                padding: 12,
                borderRadius: 6,
                background: "#1a2038",
                border: `1px solid ${BORDER}40`,
                alignItems: "start",
              }}
            >
              {/* DC */}
              <div>
                <p style={{ fontSize: 11, color: TEXT_LABEL, marginBottom: 4 }}>{pair.dcLabel}</p>
                <p style={{ fontSize: 20, fontWeight: 600, color: "#0ea5e9" }}>
                  {pair.dcVal} <span style={{ fontSize: 11, color: TEXT_UNIT }}>VDC</span>
                </p>
                <div style={{ marginTop: 4, height: 20 }}>
                  {pair.compare === "win" && pair.diff ? (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "#34d399",
                      color: "#14192D",
                    }}>
                      AC 대비 {pair.diff}
                    </span>
                  ) : <span style={{ visibility: "hidden" }}>-</span>}
                </div>
              </div>
              {/* VS divider */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 6 }}>
                <div style={{ width: 1, height: 16, background: SECTION_BORDER }} />
                <span style={{ fontSize: 10, color: "#7080a0", fontWeight: 700, letterSpacing: 1 }}>VS</span>
                <div style={{ width: 1, height: 16, background: SECTION_BORDER }} />
              </div>
              {/* AC */}
              <div>
                <p style={{ fontSize: 11, color: TEXT_LABEL, marginBottom: 4 }}>{pair.acLabel}</p>
                <p style={{ fontSize: 20, fontWeight: 600, color: "#f59e0b" }}>
                  {pair.acVal} <span style={{ fontSize: 11, color: TEXT_UNIT }}>VAC</span>
                </p>
                <div style={{ marginTop: 4, height: 20 }}><span style={{ visibility: "hidden" }}>-</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 그래프 2개: 전압 비교 / 전압 편차 비교 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* 왼쪽: 전압 비교 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 10 }}>
            DC &amp; AC 전압 (24시간)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={voltageHistory.length > 0 ? voltageHistory : [{ t: "-", ac: 0, dc: 0 }]} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3a56" vertical={false} />
              <XAxis dataKey="t" tick={HourlyTick as any} interval={0} tickLine={false} />
              <YAxis domain={vAxis.domain} tick={{ fontSize: 11, fill: "#a8b2c8" }} ticks={vAxis.ticks} interval={0} />
              <Tooltip contentStyle={tooltipStyle} itemSorter={(a) => (a.dataKey === "dc" ? -1 : 1)} isAnimationActive={false} allowEscapeViewBox={{ x: false, y: false }} />
              <Line type="monotone" dataKey="dc" stroke="#0ea5e9" strokeWidth={1.5} name="컨버터 DC 전압 (V)" dot={false} connectNulls />
              <Line type="monotone" dataKey="ac" stroke="#f59e0b" strokeWidth={1.5} name="변압기 AC 전압 (V)" dot={false} connectNulls />
              <Legend content={() => (
                <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, color: "#c5cee0", marginTop: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 14, height: 2, background: "#0ea5e9", display: "inline-block" }} />컨버터 DC 전압 (V)
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 14, height: 2, background: "#f59e0b", display: "inline-block" }} />변압기 AC 전압 (V)
                  </span>
                </div>
              )} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 오른쪽: 전압 편차 비교 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 10 }}>
            DC &amp; AC 전압 편차 (24시간)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={diffHistory.length > 0 ? diffHistory : [{ t: "-", ac: 0, dc: 0 }]} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3a56" vertical={false} />
              <XAxis dataKey="t" tick={HourlyTick as any} interval={0} tickLine={false} />
              <YAxis domain={diffAxis.domain} tick={{ fontSize: 11, fill: "#a8b2c8" }} ticks={diffAxis.ticks} interval={0} />
              <Tooltip contentStyle={tooltipStyle} itemSorter={(a) => (a.dataKey === "dc" ? -1 : 1)} isAnimationActive={false} allowEscapeViewBox={{ x: false, y: false }} />
              <Line type="monotone" dataKey="dc" stroke="#0ea5e9" strokeWidth={1.5} name="컨버터 DC 전압 편차 (V)" dot={false} connectNulls />
              <Line type="monotone" dataKey="ac" stroke="#f59e0b" strokeWidth={1.5} name="변압기 AC 전압 편차 (V)" dot={false} connectNulls />
              <Legend content={() => (
                <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, color: "#c5cee0", marginTop: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 14, height: 2, background: "#0ea5e9", display: "inline-block" }} />컨버터 DC 전압 편차 (V)
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 14, height: 2, background: "#f59e0b", display: "inline-block" }} />변압기 AC 전압 편차 (V)
                  </span>
                </div>
              )} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import KpiCard from "./KpiCard";
import { CARD_BG, BORDER, TEXT_PRIMARY, tooltipStyle } from "@/lib/ems-data";
import { useEmsStore, fmt } from "@/lib/ems-store";
import { useEffect, useState } from "react";

interface HistoryPoint {
  t: string;
  dc: number | null;
  ac: number | null;
}

function useEffHistory() {
  const [data, setData] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/ems/history?type=efficiency");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json.data ?? []);
      } catch { /* ignore */ }
    }
    load();
    const iv = setInterval(load, 60_000); // 1분마다 갱신
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

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
    if (Math.ceil(range / s) + 1 + 2 <= 8) { step = s; break; }
  }
  const min = Math.floor(rawMin / step) * step - step;
  const max = Math.ceil(rawMax / step) * step + step;
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

export default function DashboardTab() {
  const d = useEmsStore((s) => s.data?.dashboard);
  const supply = useEmsStore((s) => s.data?.supply);
  const effHistory = useEffHistory();

  const converterData = (supply?.stacks ?? []).map((s) => ({
    name: s.name,
    rated: s.rated ?? 0,
    used: s.used ?? 0,
  }));

  const effAxis = calcYAxis(effHistory, ["dc", "ac"]);

  // 바 차트 Y축 계산
  const barVals = converterData.flatMap((d) => [d.rated, d.used]);
  const barAxis = (() => {
    if (barVals.length === 0) return { domain: [0, 100] as [number, number], ticks: [0, 20, 40, 60, 80, 100] };
    const rawMax = Math.max(...barVals);
    const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    let step = 1;
    for (const s of steps) { if (Math.ceil(rawMax / s) + 1 <= 10) { step = s; break; } }
    const max = Math.ceil(rawMax / step) * step || step;
    const ticks: number[] = [];
    for (let v = 0; v <= max; v += step) ticks.push(v);
    return { domain: [0, max] as [number, number], ticks };
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        <KpiCard title="누적 전력 감축량" value={fmt(d?.reduction_energy, 1)} unit="kWh" accent="#0ea5e9" />
        <KpiCard title="누적 전력 비용 감축량" value={fmt(d?.reduction_energy_cost, 1)} unit="천원" accent="#8b5cf6" />
        <KpiCard title="누적 탄소 감축량" value={fmt(d?.reduction_carbon, 2)} unit="tCO₂" accent="#10b981" />
        <KpiCard title="누적 탄소 비용 감축량" value={fmt(d?.reduction_carbon_cost, 1)} unit="천원" accent="#8b5cf6" />
        <KpiCard title="DC 배전 효율 (실제)" value={fmt(d?.dc_eff, 1)} unit="%" accent="#0ea5e9" />
        <KpiCard title="AC 배전 효율 (가상)" value={fmt(d?.ac_eff, 1)} unit="%" accent="#f59e0b" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* DC vs AC 효율 라인 차트 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 10 }}>
            DC vs. AC 배전 효율 비교 (24시간)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={effHistory.length > 0 ? effHistory : [{ t: "-", dc: 0, ac: 0 }]} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3a56" vertical={false} />
              <XAxis dataKey="t" tick={HourlyTick as any} interval={0} tickLine={false} axisLine={{ stroke: "#3d4a68" }} />
              <YAxis domain={effAxis.domain} tick={{ fontSize: 11, fill: "#a8b2c8" }} axisLine={{ stroke: "#3d4a68" }} ticks={effAxis.ticks} interval={0} />
              <Tooltip contentStyle={tooltipStyle} itemSorter={(a) => (a.dataKey === "dc" ? -1 : 1)} isAnimationActive={false} allowEscapeViewBox={{ x: false, y: false }} />
              <Line type="monotone" dataKey="dc" stroke="#0ea5e9" strokeWidth={2} name="DC 배전 효율 (%)" dot={false} connectNulls />
              <Line type="monotone" dataKey="ac" stroke="#f59e0b" strokeWidth={2} name="AC 배전 효율 (%)" dot={false} connectNulls />
              <Legend content={() => (
                <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, color: "#c5cee0", marginTop: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 14, height: 2, background: "#0ea5e9", display: "inline-block" }} />DC 배전 효율 (%)
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 14, height: 2, background: "#f59e0b", display: "inline-block" }} />AC 배전 효율 (%)
                  </span>
                </div>
              )} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 컨버터 스택별 사용률 바 차트 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 10 }}>
            AC/DC 컨버터 스택별 사용률
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={converterData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3a56" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#a8b2c8" }} axisLine={{ stroke: "#3d4a68" }} />
              <YAxis domain={barAxis.domain} tick={{ fontSize: 11, fill: "#a8b2c8" }} axisLine={{ stroke: "#3d4a68" }} ticks={barAxis.ticks} interval={0} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name) => [`${v} kW`, name]}
                cursor={{ fill: "transparent" }}
              />
              <Bar
                dataKey="rated"
                fill="#5a6a8a"
                name="정격 (kW)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                label={(props: any) => { const { x, y, width, value } = props; return (
                  <text x={x + width / 2} y={y - 5} textAnchor="middle" fill="#a8b2c8" fontSize={10}>{value} kW</text>
                ); }}
              />
              <Bar
                dataKey="used"
                fill="#0ea5e9"
                name="사용량 (kW)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                label={(props: any) => { const { x, y, width, value } = props; return (
                  <text x={x + width / 2} y={y - 5} textAnchor="middle" fill="#7dd3fc" fontSize={10}>{value} kW</text>
                ); }}
              />
              <Legend content={() => (
                <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 11, color: "#a8b2c8", marginTop: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 10, height: 10, background: "#5a6a8a", borderRadius: 2, display: "inline-block" }} />정격 (kW)
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 10, height: 10, background: "#0ea5e9", borderRadius: 2, display: "inline-block" }} />사용량 (kW)
                  </span>
                </div>
              )} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

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

/** Y축 domain을 10 단위로 정렬 */
function domainBy10(data: HistoryPoint[], keys: ("dc" | "ac")[]) {
  const vals = data.flatMap((d) => keys.map((k) => d[k]).filter((v): v is number => v != null));
  if (vals.length === 0) return [0, 100] as const;
  const min = Math.floor(Math.min(...vals) / 10) * 10;
  const max = Math.ceil(Math.max(...vals) / 10) * 10;
  return [min, max === min ? min + 10 : max] as const;
}

/** 정각(HH:00)인 포인트만 X축 라벨로 표시 */
function hourlyTicks(data: HistoryPoint[]): string[] {
  return data.map((d) => d.t).filter((t) => t.endsWith(":00"));
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

  const effDomain = domainBy10(effHistory, ["dc", "ac"]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        <KpiCard title="누적 전력 감축량" value={fmt(d?.reduction_energy, 1)} unit="kWh" />
        <KpiCard title="누적 탄소 감축량" value={fmt(d?.reduction_carbon, 2)} unit="tCO₂" accent="#10b981" />
        <KpiCard title="누적 전력 비용 감축량" value={fmt(d?.reduction_energy_cost, 1)} unit="백만원" accent="#f59e0b" />
        <KpiCard title="누적 탄소 비용 감축량" value={fmt(d?.reduction_carbon_cost, 1)} unit="백만원" accent="#f59e0b" />
        <KpiCard title="DC 배전 효율" value={fmt(d?.dc_eff, 1)} unit="%" />
        <KpiCard title="AC 배전 효율 (가상)" value={fmt(d?.ac_eff, 1)} unit="%" accent="#f97316" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* DC vs AC 효율 라인 차트 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 10 }}>
            DC vs. AC 배전 효율 비교 (24시간)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={effHistory.length > 0 ? effHistory : [{ t: "-", dc: 0, ac: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3a56" />
              <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#a8b2c8" }} axisLine={{ stroke: "#3d4a68" }} ticks={hourlyTicks(effHistory)} />
              <YAxis domain={effDomain} tick={{ fontSize: 11, fill: "#a8b2c8" }} axisLine={{ stroke: "#3d4a68" }} tickCount={Math.floor((effDomain[1] - effDomain[0]) / 10) + 1} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="dc" stroke="#0ea5e9" strokeWidth={2} name="DC 효율 (%)" dot={false} connectNulls />
              <Line type="monotone" dataKey="ac" stroke="#f59e0b" strokeWidth={2} name="AC 효율 (%)" dot={false} connectNulls />
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
              <YAxis tick={{ fontSize: 11, fill: "#a8b2c8" }} axisLine={{ stroke: "#3d4a68" }} unit=" kW" />
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
                label={{ position: "top", fontSize: 10, fill: "#a8b2c8", formatter: (v: unknown) => `${v} kW` }}
              />
              <Bar
                dataKey="used"
                fill="#0ea5e9"
                name="사용량 (kW)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                label={{ position: "top", fontSize: 10, fill: "#7dd3fc", formatter: (v: unknown) => `${v} kW` }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#a8b2c8" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

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

export default function QualityTab() {
  const q = useEmsStore((s) => s.data?.quality);
  const voltageHistory = useHistory("voltage");
  const diffHistory = useHistory("voltage_diff");

  const dcMetrics = [
    { label: "컨버터 전압", val: fmt(q?.dc_voltage), unit: "V" },
    { label: "컨버터 전압 편차", val: fmt(q?.dc_v_diff_yesterday), unit: "V" },
  ];
  const acMetrics = [
    { label: "변압기 전압 (가상)", val: fmt(q?.ac_voltage), unit: "V" },
    { label: "변압기 전압 편차 (가상)", val: fmt(q?.ac_v_diff_yesterday), unit: "V" },
  ];
  const gridMetrics = [
    { label: "계통 전압 불평형률", val: q?.v_unbal != null ? fmt(q.v_unbal) : "-", unit: "%" },
    { label: "계통 역률", val: q?.pf != null ? fmt(q.pf) : "-", unit: "" },
  ];

  const vDomain = domainBy10(voltageHistory, ["ac", "dc"]);
  const diffDomain = domainBy10(diffHistory, ["ac", "dc"]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 전력 품질 현황 */}
      <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 12 }}>전력 품질 현황</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 16 }}>
          {/* DC 배전 시스템 (실제) */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: TEXT_LABEL, marginBottom: 6 }}>DC 배전 시스템 (실제)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {dcMetrics.map((m) => (
                <div key={m.label} style={{ padding: 12, borderRadius: 6, background: "#1a2038", border: `1px solid ${BORDER}40` }}>
                  <p style={{ fontSize: 11, color: TEXT_LABEL, marginBottom: 4 }}>{m.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>
                    {m.val} <span style={{ fontSize: 11, color: TEXT_UNIT }}>{m.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: 1, background: SECTION_BORDER, alignSelf: "stretch" }} />

          {/* AC 배전 시스템 (가상) */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: TEXT_LABEL, marginBottom: 6 }}>AC 배전 시스템 (가상)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {acMetrics.map((m) => (
                <div key={m.label} style={{ padding: 12, borderRadius: 6, background: "#1a2038", border: `1px solid ${BORDER}40` }}>
                  <p style={{ fontSize: 11, color: TEXT_LABEL, marginBottom: 4 }}>{m.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>
                    {m.val} <span style={{ fontSize: 11, color: TEXT_UNIT }}>{m.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: 1, background: SECTION_BORDER, alignSelf: "stretch" }} />

          {/* 계통 전압 */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: TEXT_LABEL, marginBottom: 6 }}>계통 전압</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {gridMetrics.map((m) => (
                <div key={m.label} style={{ padding: 12, borderRadius: 6, background: "#1a2038", border: `1px solid ${BORDER}40` }}>
                  <p style={{ fontSize: 11, color: TEXT_LABEL, marginBottom: 4 }}>{m.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>
                    {m.val} <span style={{ fontSize: 11, color: TEXT_UNIT }}>{m.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 그래프 2개: 전압 비교 / 전압 편차 비교 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* 왼쪽: 전압 비교 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 10 }}>
            DC vs AC 실시간 전압 비교 (24시간)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={voltageHistory.length > 0 ? voltageHistory : [{ t: "-", ac: 0, dc: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3a56" />
              <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#a8b2c8" }} ticks={hourlyTicks(voltageHistory)} />
              <YAxis domain={vDomain} tick={{ fontSize: 11, fill: "#a8b2c8" }} tickCount={Math.floor((vDomain[1] - vDomain[0]) / 10) + 1} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="dc" stroke="#0ea5e9" strokeWidth={1.5} name="DC 후단전압 (V)" dot={false} connectNulls />
              <Line type="monotone" dataKey="ac" stroke="#f59e0b" strokeWidth={1.5} name="AC 선간전압 (V)" dot={false} connectNulls />
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
            DC vs AC 실시간 전압 편차 비교 (24시간)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={diffHistory.length > 0 ? diffHistory : [{ t: "-", ac: 0, dc: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3a56" />
              <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#a8b2c8" }} ticks={hourlyTicks(diffHistory)} />
              <YAxis domain={diffDomain} tick={{ fontSize: 11, fill: "#a8b2c8" }} tickCount={Math.floor((diffDomain[1] - diffDomain[0]) / 10) + 1} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="dc" stroke="#0ea5e9" strokeWidth={1.5} name="DC 전압 편차 (V)" dot={false} connectNulls />
              <Line type="monotone" dataKey="ac" stroke="#f59e0b" strokeWidth={1.5} name="AC 선간전압 편차 (V)" dot={false} connectNulls />
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

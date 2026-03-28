"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { CARD_BG, BORDER, TEXT_PRIMARY, TEXT_LABEL } from "@/lib/ems-data";
import { useEmsStore, fmt } from "@/lib/ems-store";

const COLORS = ["#0ea5e9", "#0ea5e9", "#0ea5e9"];

export default function SupplyTab() {
  const supply = useEmsStore((s) => s.data?.supply);

  const totalRated = supply?.total_rated ?? 0;
  const totalUsed = supply?.total_used ?? 0;
  const reserveMargin = supply?.reserve_margin;

  const reserveNum = reserveMargin != null ? reserveMargin : totalRated > 0 ? (1 - totalUsed / totalRated) * 100 : 0;
  const reserve = reserveMargin != null ? fmt(reserveMargin) : totalRated > 0 ? reserveNum.toFixed(1) : "-";
  const reservePct = Math.max(0, Math.min(100, Math.round(reserveNum)));

  const stacks = (supply?.stacks ?? []).map((s) => ({
    name: s.name,
    rated: s.rated ?? 0,
    used: s.used ?? 0,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* 공급 예비율 도넛 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 12 }}>공급 예비율</p>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ position: "relative", width: 130, height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ v: reservePct }, { v: 100 - reservePct }]}
                    dataKey="v"
                    innerRadius={40}
                    outerRadius={58}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="#0ea5e9" />
                    <Cell fill="#1a2038" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{reserve}%</span>
                <span style={{ fontSize: 10, color: "#7080a0" }}>예비율</span>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: TEXT_LABEL }}>
                <span>컨버터 정격 합계</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#e2e8f0" }}>{totalRated.toFixed(0)} kW</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: TEXT_LABEL }}>
                <span>컨버터 사용 합계</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#e2e8f0" }}>{totalUsed.toFixed(0)} kW</span>
              </div>
              <div style={{ height: 1, background: BORDER }} />
              <div style={{ display: "flex", justifyContent: "space-between", color: "#0ea5e9", fontWeight: 600 }}>
                <span>공급 예비율</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{reserve}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 스택별 사용량 바 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 12 }}>
            AC/DC 컨버터 스택별 사용량
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
            {stacks.map((c, i) => {
              const pct = c.rated > 0 ? (c.used / c.rated * 100).toFixed(1) : "0.0";
              return (
                <div key={c.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>{c.name}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", color: TEXT_LABEL }}>
                      {c.used.toFixed(0)} / {c.rated.toFixed(0)} kW ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "#1a2038", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 4,
                        width: `${Math.min(parseFloat(pct), 100)}%`,
                        background: COLORS[i],
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

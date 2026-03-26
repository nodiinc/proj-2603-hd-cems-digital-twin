"use client";

import { CARD_BG, TEXT_LABEL, TEXT_UNIT } from "@/lib/ems-data";

interface KpiCardProps {
  title: string;
  value: string;
  unit: string;
  trend?: string;
  accent?: string;
}

export default function KpiCard({
  title,
  value,
  unit,
  trend,
  accent = "#0ea5e9",
}: KpiCardProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: CARD_BG, borderLeft: `3px solid ${accent}` }}
    >
      <p style={{ fontSize: 11, color: TEXT_LABEL, marginBottom: 4 }}>{title}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 600, color: "#fff" }}>{value}</span>
        <span style={{ fontSize: 11, color: TEXT_UNIT }}>{unit}</span>
      </div>
      {trend && (
        <p style={{ fontSize: 11, color: "#34d399", marginTop: 4 }}>{trend}</p>
      )}
    </div>
  );
}

"use client";

import { CARD_BG, TEXT_PRIMARY, TEXT_LABEL, TEXT_UNIT } from "@/lib/ems-data";
import { useEmsStore, fmt } from "@/lib/ems-store";

const IMG_BASE = "/images/efficiency_tab";
const BOX_SIZE = 76;
const IMG_SIZE = 50;
const ARROW_W = 105;

/** 이미지 노드 (계통, 부하 등 효율 없는 것) */
function Node({ label, color, img }: { label: string; color: string; img: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: BOX_SIZE,
          height: BOX_SIZE,
          borderRadius: 10,
          border: `1.5px solid ${color}50`,
          background: `${color}10`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img src={`${IMG_BASE}/${img}.png`} alt={label} style={{ width: IMG_SIZE, height: IMG_SIZE, objectFit: "contain" }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color, whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

/** 이미지 노드 + 효율 표시 (컨버터, SMPS 등) */
function Box({ label, eff, color, img }: { label: string; eff: string; color: string; img: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: BOX_SIZE,
          height: BOX_SIZE,
          borderRadius: 10,
          border: `1.5px solid ${color}50`,
          background: `${color}10`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img src={`${IMG_BASE}/${img}.png`} alt={label} style={{ width: IMG_SIZE, height: IMG_SIZE, objectFit: "contain" }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#34d399", marginTop: -4, whiteSpace: "nowrap" }}>{eff}</span>
    </div>
  );
}

/** 화살표 + 아래에 수치 라벨. 화살표가 박스 중앙에 맞도록 paddingTop 적용 */
function ArrowWithLabel({ power, voltage }: { power: string; voltage: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: ARROW_W, paddingTop: BOX_SIZE / 2 - 8 }}>
      <svg width={ARROW_W} height="16" viewBox={`0 0 ${ARROW_W} 16`} style={{ flexShrink: 0 }}>
        <line x1="0" y1="8" x2={ARROW_W - 8} y2="8" stroke="#4a5578" strokeWidth="1.5" />
        <path d={`M${ARROW_W - 8} 8L${ARROW_W - 14} 3M${ARROW_W - 8} 8L${ARROW_W - 14} 13`} stroke="#4a5578" strokeWidth="1.5" fill="none" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>
          {power} <span style={{ fontSize: 11, color: TEXT_UNIT }}>kW</span>
        </span>
        <span style={{ fontSize: 12, color: TEXT_LABEL, whiteSpace: "nowrap" }}>{voltage} V</span>
      </div>
    </div>
  );
}

export default function EfficiencyTab() {
  const dc = useEmsStore((s) => s.data?.efficiency?.dc);
  const ac = useEmsStore((s) => s.data?.efficiency?.ac);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* DC 배전 구성도 */}
      <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 12 }}>
          DC 배전 구성도 (실제)
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 0,
            padding: "12px 0",
          }}
        >
          <Node label="공장 계통" color="#60a5fa" img="common-grid" />
          <ArrowWithLabel power={fmt(dc?.conv_in_p)} voltage={fmt(dc?.conv_in_v, 0)} />
          <Box label="AC/DC 컨버터" eff={`효율 ${fmt(dc?.conv_eff)}%`} color="#0ea5e9" img="dc-conv" />
          <ArrowWithLabel power={fmt(dc?.conv_out_p)} voltage={fmt(dc?.conv_out_v, 0)} />
          <Box label="SMPS" eff={`효율 ${fmt(dc?.smps_eff)}%`} color="#8b5cf6" img="common-smps" />
          <ArrowWithLabel power={fmt(dc?.smps_out_p)} voltage="48" />
          <Node label="LED 부하" color="#f97316" img="common-led" />
        </div>
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 16px",
              borderRadius: 20,
              background: "#0ea5e910",
              border: "1px solid #0ea5e930",
            }}
          >
            <span style={{ fontSize: 12, color: TEXT_LABEL }}>DC 배전 효율</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0ea5e9" }}>{fmt(dc?.total_eff)}%</span>
            <span style={{ fontSize: 10, color: TEXT_UNIT }}>= SMPS 후단 / 컨버터 전단 × 100</span>
          </span>
        </div>
      </div>

      {/* AC 배전 구성도 */}
      <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 12 }}>
          AC 배전 구성도 (가상)
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 0,
            padding: "12px 0",
          }}
        >
          <Node label="공장 계통" color="#60a5fa" img="common-grid" />
          <ArrowWithLabel power={fmt(ac?.tr_in_p)} voltage={fmt(ac?.tr_in_v, 0)} />
          <Box label="변압기" eff={`효율 ${fmt(ac?.tr_eff)}%`} color="#f59e0b" img="ac-tr" />
          <ArrowWithLabel power={fmt(ac?.tr_out_p)} voltage={fmt(ac?.tr_out_v, 0)} />
          <Box label="SMPS" eff={`효율 ${fmt(ac?.smps_eff)}%`} color="#8b5cf6" img="common-smps" />
          <ArrowWithLabel power={fmt(ac?.smps_out_p)} voltage="48" />
          <Node label="LED 부하" color="#f97316" img="common-led" />
        </div>
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 16px",
              borderRadius: 20,
              background: "#f59e0b10",
              border: "1px solid #f59e0b30",
            }}
          >
            <span style={{ fontSize: 12, color: TEXT_LABEL }}>AC 배전 효율</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#f59e0b" }}>{fmt(ac?.total_eff)}%</span>
            <span style={{ fontSize: 10, color: TEXT_UNIT }}>= SMPS 후단 / 변압기 전단 × 100</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Color tokens ────────────────────────────────────────────────────────────
export const CARD_BG = "#262B41";
export const BORDER = "#333952";
export const INNER_BG = "#1a2038";

/** 가독성 향상을 위한 텍스트 색상 */
export const TEXT_PRIMARY = "#e2e8f0";   // 주요 값
export const TEXT_LABEL = "#a8b2c8";     // 항목 라벨 (기존 #8892b0 → 밝게)
export const TEXT_SECTION = "#8899b4";   // 섹션 제목 (기존 #5a6380 → 밝게)
export const TEXT_UNIT = "#7080a0";      // 단위 (기존 #5a6380 → 밝게)
export const SECTION_BORDER = "#3d4a68"; // 섹션 구분선 (기존 BORDER+50 → 밝게)
export const ROW_BORDER = "#2e3750";     // 행 구분선 (기존 BORDER+20 → 밝게)

// ─── Dummy data ───────────────────────────────────────────────────────────────

/** 24시간 DC vs AC 배전 효율 */
export const efficiencyData = Array.from({ length: 24 }, (_, t) => ({
  t: `${String(t).padStart(2, "0")}:00`,
  dc: +(91.5 + 2.2 * Math.sin(t / 4) + 0.5 * Math.random()).toFixed(1),
  ac: +(86.8 + 1.8 * Math.sin(t / 4) + 0.5 * Math.random()).toFixed(1),
}));

/** 컨버터 스택별 사용량 */
export const converterData = [
  { name: "컨버터1", rated: 100, used: 62 },
  { name: "컨버터2", rated: 100, used: 71 },
  { name: "컨버터3", rated: 100, used: 55 },
];

/** 24시간 전압 추이 */
export const voltageData = Array.from({ length: 24 }, (_, t) => ({
  t: `${String(t).padStart(2, "0")}:00`,
  ac: +(378 + 3 * Math.sin(t / 3) + 2).toFixed(1),
  dc: +(379 + 2 * Math.cos(t / 4) + 1).toFixed(1),
}));

/** Recharts 툴팁 공통 스타일 */
export const tooltipStyle = {
  background: INNER_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  fontSize: 12,
  color: "#e2e8f0",
};

// ─── 모니터링 raw data ─────────────────────────────────────────────────────────
export const monitoringAC = [
  { tag: "Vab", label: "전압 A-B상", unit: "V", val: "381.2" },
  { tag: "Vbc", label: "전압 B-C상", unit: "V", val: "380.5" },
  { tag: "Vca", label: "전압 C-A상", unit: "V", val: "379.8" },
  { tag: "Hz", label: "주파수", unit: "Hz", val: "60.0" },
  { tag: "Ia", label: "전류 A상", unit: "A", val: "152.3" },
  { tag: "Ib", label: "전류 B상", unit: "A", val: "151.8" },
  { tag: "Ic", label: "전류 C상", unit: "A", val: "153.1" },
  { tag: "W", label: "유효전력", unit: "W", val: "85200" },
  { tag: "Var_1", label: "무효전력", unit: "var", val: "1240" },
  { tag: "VA", label: "피상전력", unit: "VA", val: "85210" },
  { tag: "PF", label: "역률", unit: "%", val: "99.2" },
];

export const monitoringDC = [
  { tag: "Vdc_Link", label: "DC링크 전압", unit: "V", val: "620.3" },
  { tag: "Idc_Link", label: "DC링크 전류", unit: "A", val: "137.4" },
  { tag: "Vdc_Out", label: "DC출력 전압", unit: "V", val: "380.1" },
  { tag: "Idc_Out", label: "DC출력 전류", unit: "A", val: "217.8" },
  { tag: "Pdc_W", label: "DC출력 유효전력", unit: "W", val: "82800" },
];

export const monitoringEnergy = [
  { tag: "DAY_kWh_R", label: "일간 수전 유효전력량", unit: "kWh", val: "1240" },
  { tag: "DAY_kWh_T", label: "일간 송전 유효전력량", unit: "kWh", val: "1180" },
  { tag: "MONTH_kWh_R", label: "월간 수전 유효전력량", unit: "kWh", val: "28400" },
  { tag: "MONTH_kWh_T", label: "월간 송전 유효전력량", unit: "kWh", val: "27200" },
  { tag: "Total_MWh_R", label: "전체 수전 유효전력량", unit: "MWh", val: "142.8" },
  { tag: "Total_MWh_T", label: "전체 송전 유효전력량", unit: "MWh", val: "138.4" },
];

export const monitoringTemp = [
  { tag: "TEMP_IGBT", label: "IGBT 온도", unit: "°C", val: "42.1" },
  { tag: "TEMP_TRANS", label: "변압기 온도", unit: "°C", val: "38.7" },
];

export const monitoringAlarm = [
  { tag: "Warning", label: "경고", unit: "", val: "OFF" },
  { tag: "Fault", label: "오류", unit: "", val: "OFF" },
  { tag: "Status", label: "상태", unit: "", val: "ON" },
];

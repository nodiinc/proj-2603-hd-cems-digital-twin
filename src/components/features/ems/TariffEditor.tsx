"use client";

import { useState, useEffect, useCallback } from "react";
import { CARD_BG, BORDER, TEXT_PRIMARY, TEXT_LABEL } from "@/lib/ems-data";

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface TariffRow {
  desc: string; // 설명 (프론트 식별용, JSON 출력에서 제외)
  months: number[]; // 선택된 월 (1~12)
  light: string;
  mid: string;
  peak: string;
}

interface TimeEntry {
  tariff_idx: number;
  load_type: "light" | "mid" | "peak";
  hours: number[]; // 선택된 시간 (0~23)
}

export interface TariffData {
  tariffs: TariffRow[];
  times: TimeEntry[];
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const cellStyle: React.CSSProperties = {
  padding: "4px 6px",
  fontSize: 12,
  borderBottom: `1px solid ${BORDER}40`,
};

const inputStyle: React.CSSProperties = {
  background: "#1a2038",
  border: `1px solid ${BORDER}60`,
  color: "#e2e8f0",
  height: 26,
  fontSize: 12,
  borderRadius: 3,
  padding: "0 6px",
  width: "100%",
  fontVariantNumeric: "tabular-nums",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  padding: "6px 6px",
  fontSize: 11,
  fontWeight: 600,
  color: TEXT_LABEL,
  borderBottom: `1.5px solid ${BORDER}80`,
  textAlign: "center",
};

const btnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 4,
  border: "none",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const LOAD_TYPES = [
  { key: "light" as const, label: "경부하" },
  { key: "mid" as const, label: "중간부하" },
  { key: "peak" as const, label: "최대부하" },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

interface Props {
  initial: TariffData;
  onDirtyChange: (dirty: boolean, data: TariffData) => void;
}

export default function TariffEditor({ initial, onDirtyChange }: Props) {
  const [tariffs, setTariffs] = useState<TariffRow[]>(
    initial.tariffs.map((t) => {
      const raw = t as unknown as Record<string, unknown>;
      // 이전 형식 (start_month/end_month) → months 변환
      if (!Array.isArray(raw.months) && typeof raw.start_month === "number" && typeof raw.end_month === "number") {
        const months: number[] = [];
        let m = raw.start_month as number;
        const end = raw.end_month as number;
        for (let i = 0; i < 12; i++) {
          months.push(m);
          if (m === end) break;
          m = m % 12 + 1;
        }
        return { desc: String(raw.desc ?? ""), months, light: String(raw.light ?? ""), mid: String(raw.mid ?? ""), peak: String(raw.peak ?? "") };
      }
      return { desc: String(raw.desc ?? ""), months: Array.isArray(raw.months) ? raw.months : [], light: String(raw.light ?? ""), mid: String(raw.mid ?? ""), peak: String(raw.peak ?? "") };
    }),
  );
  const [times, setTimes] = useState<TimeEntry[]>(initial.times);

  const emptyTariff: TariffRow = { desc: "", months: [], light: "", mid: "", peak: "" };

  const getData = useCallback((): TariffData => ({
    tariffs,
    times,
  }), [tariffs, times]);

  useEffect(() => {
    const data = getData();
    const dirty = JSON.stringify(data) !== JSON.stringify(initial);
    onDirtyChange(dirty, data);
  }, [tariffs, times, initial, onDirtyChange, getData]);

  // 변경 여부
  const isTariffChanged = (idx: number, field: keyof TariffRow): boolean => {
    if (field === "desc") return false; // desc는 로컬 전용
    if (idx >= initial.tariffs.length) return true;
    return String(tariffs[idx]?.[field] ?? "") !== String((initial.tariffs[idx] as unknown as Record<string, unknown>)?.[field] ?? "");
  };
  const changedBorder = "#f59e0b80";

  // ─── 전기요금 테이블 ───────────────────────────────────────────────────────

  const addTariff = () => {
    const newIdx = tariffs.length;
    setTariffs([...tariffs, { ...emptyTariff }]);
    // 시간 테이블에 경부하/중간부하/최대부하 3개 자동 추가
    setTimes([
      ...times,
      { tariff_idx: newIdx, load_type: "light", hours: [] },
      { tariff_idx: newIdx, load_type: "mid", hours: [] },
      { tariff_idx: newIdx, load_type: "peak", hours: [] },
    ]);
  };

  const removeTariff = (idx: number) => {
    setTariffs(tariffs.filter((_, i) => i !== idx));
    // 해당 tariff의 시간 엔트리 제거 + 뒤 인덱스 조정
    setTimes(
      times
        .filter((t) => t.tariff_idx !== idx)
        .map((t) => (t.tariff_idx > idx ? { ...t, tariff_idx: t.tariff_idx - 1 } : t)),
    );
  };

  const updateTariff = (idx: number, field: keyof TariffRow, val: string) => {
    setTariffs(tariffs.map((r, i) => i !== idx ? r : { ...r, [field]: val }));
  };

  // 월 토글 + 드래그
  const [monthDrag, setMonthDrag] = useState<{ idx: number; adding: boolean; startMonth: number } | null>(null);

  const setMonthsRange = (idx: number, fromM: number, toM: number, add: boolean) => {
    const lo = Math.min(fromM, toM);
    const hi = Math.max(fromM, toM);
    setTariffs((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      const cur = new Set(r.months);
      for (let m = lo; m <= hi; m++) { if (add) cur.add(m); else cur.delete(m); }
      return { ...r, months: [...cur].sort((a, b) => a - b) };
    }));
  };

  const onMonthMouseDown = (idx: number, month: number) => {
    const adding = !tariffs[idx].months.includes(month);
    setMonthDrag({ idx, adding, startMonth: month });
    setMonthsRange(idx, month, month, adding);
  };

  const onMonthMouseEnter = (idx: number, month: number) => {
    if (!monthDrag || monthDrag.idx !== idx) return;
    setMonthsRange(idx, monthDrag.startMonth, month, monthDrag.adding);
  };

  const onMonthMouseUp = () => setMonthDrag(null);

  // ─── 시간 토글 + 드래그 (범위 채우기) ────────────────────────────────────────

  const [drag, setDrag] = useState<{ tariffIdx: number; loadType: "light" | "mid" | "peak"; adding: boolean; startHour: number } | null>(null);

  const setHoursRange = (tariffIdx: number, loadType: "light" | "mid" | "peak", fromH: number, toH: number, add: boolean) => {
    const lo = Math.min(fromH, toH);
    const hi = Math.max(fromH, toH);
    setTimes((prev) => prev.map((t) => {
      if (t.tariff_idx !== tariffIdx || t.load_type !== loadType) return t;
      const cur = new Set(t.hours ?? []);
      for (let h = lo; h <= hi; h++) {
        if (add) cur.add(h); else cur.delete(h);
      }
      return { ...t, hours: [...cur].sort((a, b) => a - b) };
    }));
  };

  const onCellMouseDown = (tariffIdx: number, loadType: "light" | "mid" | "peak", hour: number) => {
    const selected = isHourSelected(tariffIdx, loadType, hour);
    const adding = !selected;
    setDrag({ tariffIdx, loadType, adding, startHour: hour });
    setHoursRange(tariffIdx, loadType, hour, hour, adding);
  };

  const onCellMouseEnter = (tariffIdx: number, loadType: "light" | "mid" | "peak", hour: number) => {
    if (!drag || drag.tariffIdx !== tariffIdx || drag.loadType !== loadType) return;
    setHoursRange(tariffIdx, loadType, drag.startHour, hour, drag.adding);
  };

  const onMouseUp = () => setDrag(null);

  const isHourSelected = (tariffIdx: number, loadType: "light" | "mid" | "peak", hour: number): boolean => {
    const entry = times.find((t) => t.tariff_idx === tariffIdx && t.load_type === loadType);
    return entry?.hours?.includes(hour) ?? false;
  };

  const isHourChanged = (tariffIdx: number, loadType: "light" | "mid" | "peak", hour: number): boolean => {
    const curr = isHourSelected(tariffIdx, loadType, hour);
    const orig = initial.times.find((t) => t.tariff_idx === tariffIdx && t.load_type === loadType);
    const origSelected = orig?.hours?.includes(hour) ?? false;
    return curr !== origSelected;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1500, margin: "0 auto" }}>

      {/* 월별/부하별 전기요금 설정 */}
      <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 10 }}>월별/부하별 전기요금 설정</p>
        <table style={{ width: "100%", borderCollapse: "collapse", userSelect: "none" }} onMouseUp={onMonthMouseUp} onMouseLeave={onMonthMouseUp}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 36 }} rowSpan={2}>번호</th>
              <th style={thStyle} rowSpan={2}>설명</th>
              <th colSpan={12} style={thStyle}>월</th>
              <th colSpan={3} style={thStyle}>부하 요금 (원/kWh)</th>
              <th style={{ ...thStyle, width: 36 }} rowSpan={2}>
                <div>관리</div>
                <button onClick={addTariff} style={{ ...btnStyle, background: "#10b98120", color: "#34d399", margin: "4px auto 0" }}>+</button>
              </th>
            </tr>
            <tr>
              {MONTHS.map((m) => <th key={m} style={{ ...thStyle, padding: "4px 2px", fontSize: 10, minWidth: 30 }}>{m}</th>)}
              <th style={thStyle}>경부하</th>
              <th style={thStyle}>중간부하</th>
              <th style={thStyle}>최대부하</th>
            </tr>
          </thead>
          <tbody>
            {tariffs.map((row, idx) => (
              <tr key={idx}>
                <td style={{ ...cellStyle, textAlign: "center", color: TEXT_LABEL }}>{idx + 1}</td>
                <td style={cellStyle}>
                  <input
                    style={{ ...inputStyle, borderColor: isTariffChanged(idx, "desc") ? changedBorder : `${BORDER}60` }}
                    value={row.desc}
                    onChange={(e) => updateTariff(idx, "desc", e.target.value)}
                    placeholder="예: 겨울"
                  />
                </td>
                {MONTHS.map((m) => {
                  const selected = row.months.includes(m);
                  const origMonths = (initial.tariffs[idx] as unknown as Record<string, unknown>)?.months;
                  const origSelected = Array.isArray(origMonths) && origMonths.includes(m);
                  const changed = idx >= initial.tariffs.length || selected !== origSelected;
                  return (
                    <td key={m}
                      onMouseDown={() => onMonthMouseDown(idx, m)}
                      onMouseEnter={() => onMonthMouseEnter(idx, m)}
                      style={{ padding: "3px 0", textAlign: "center", cursor: "pointer", borderBottom: `1px solid ${BORDER}40`, borderLeft: `1px solid ${BORDER}20` }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 3, margin: "0 auto",
                        background: selected ? "#0ea5e9" : "#1a2038",
                        border: `1px solid ${changed ? "#f59e0b" : selected ? "#0ea5e980" : `${BORDER}40`}`,
                        transition: "all 0.1s",
                      }} />
                    </td>
                  );
                })}
                <td style={cellStyle}><input style={{ ...inputStyle, borderColor: isTariffChanged(idx, "light") ? changedBorder : `${BORDER}60` }} value={row.light} onChange={(e) => updateTariff(idx, "light", e.target.value)} /></td>
                <td style={cellStyle}><input style={{ ...inputStyle, borderColor: isTariffChanged(idx, "mid") ? changedBorder : `${BORDER}60` }} value={row.mid} onChange={(e) => updateTariff(idx, "mid", e.target.value)} /></td>
                <td style={cellStyle}><input style={{ ...inputStyle, borderColor: isTariffChanged(idx, "peak") ? changedBorder : `${BORDER}60` }} value={row.peak} onChange={(e) => updateTariff(idx, "peak", e.target.value)} /></td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <button onClick={() => removeTariff(idx)} style={{ ...btnStyle, background: "#f8717120", color: "#f87171" }}>−</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 계절별/부하별 시간 설정 */}
      {tariffs.length > 0 && (
        <div className="rounded-lg" style={{ background: CARD_BG, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 10 }}>계절별/부하별 시간 설정</p>
          <table style={{ width: "100%", borderCollapse: "collapse", userSelect: "none" }} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 36 }} rowSpan={2}>번호</th>
                <th style={thStyle} rowSpan={2}>설명</th>
                <th style={{ ...thStyle, width: 90 }} rowSpan={2}>부하</th>
                <th colSpan={24} style={thStyle}>시간</th>
              </tr>
              <tr>
                {HOURS.map((h) => (
                  <th key={h} style={{ ...thStyle, padding: "4px 0", fontSize: 10, width: 36 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tariffs.map((tariff, tIdx) => (
                LOAD_TYPES.map((lt, ltIdx) => (
                  <tr key={`${tIdx}-${lt.key}`}>
                    {ltIdx === 0 && (
                      <>
                        <td
                          rowSpan={3}
                          style={{
                            ...cellStyle,
                            textAlign: "center",
                            color: TEXT_LABEL,
                            verticalAlign: "middle",
                            borderBottom: `2px solid ${BORDER}60`,
                          }}
                        >
                          {tIdx + 1}
                        </td>
                        <td
                          rowSpan={3}
                          style={{
                            ...cellStyle,
                            textAlign: "center",
                            color: "#e2e8f0",
                            fontSize: 12,
                            fontVariantNumeric: "tabular-nums",
                            verticalAlign: "middle",
                            borderBottom: `2px solid ${BORDER}60`,
                          }}
                        >
                          {tariff.desc || "-"}
                        </td>
                      </>
                    )}
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: "center",
                        fontSize: 12,
                        color: "#e2e8f0",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                        borderBottom: ltIdx === 2 ? `2px solid ${BORDER}60` : cellStyle.borderBottom,
                      }}
                    >
                      {lt.label}
                    </td>
                    {HOURS.map((h) => {
                      const selected = isHourSelected(tIdx, lt.key, h);
                      const changed = isHourChanged(tIdx, lt.key, h);
                      return (
                        <td
                          key={h}
                          onMouseDown={() => onCellMouseDown(tIdx, lt.key, h)}
                          onMouseEnter={() => onCellMouseEnter(tIdx, lt.key, h)}
                          style={{
                            padding: "3px 0",
                            textAlign: "center",
                            cursor: "pointer",
                            borderBottom: ltIdx === 2 ? `2px solid ${BORDER}60` : `1px solid ${BORDER}40`,
                            borderLeft: `1px solid ${BORDER}20`,
                          }}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 3,
                              margin: "0 auto",
                              background: selected ? "#0ea5e9" : "#1a2038",
                              border: `1px solid ${changed ? "#f59e0b" : selected ? "#0ea5e980" : `${BORDER}40`}`,
                              transition: "all 0.1s",
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

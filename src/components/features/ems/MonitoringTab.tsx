"use client";

import { CARD_BG, BORDER, TEXT_PRIMARY, TEXT_LABEL, TEXT_SECTION, TEXT_UNIT, SECTION_BORDER, ROW_BORDER } from "@/lib/ems-data";
import { useEmsStore, fmt, type DataItem } from "@/lib/ems-store";

interface Section {
  title: string;
  items: DataItem[];
  twoLine?: boolean;
}

/** 알람 항목: 경고/오류는 >=1이면 ON, 0이면 OFF. 상태값은 숫자 그대로 표시. */
function AlarmRow({ item }: { item: DataItem }) {
  const raw = item.val;
  const parsed = Number(raw);
  const numVal = typeof raw === "number" ? raw : typeof raw === "boolean" ? (raw ? 1 : 0) : isNaN(parsed) ? 0 : parsed;

  // 상태값은 숫자 그대로 표시
  if (item.tag === "Status") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          padding: "4px 0",
          borderBottom: `1px solid ${ROW_BORDER}`,
        }}
      >
        <span style={{ color: TEXT_LABEL }}>상태값</span>
        <span style={{ fontVariantNumeric: "tabular-nums", color: TEXT_PRIMARY, fontWeight: 500 }}>
          {raw != null && !isNaN(Number(raw)) ? Math.round(Number(raw)) : "-"}
        </span>
      </div>
    );
  }

  // 경고/오류: >= 1 이면 ON
  const isOn = numVal >= 1;
  const dotColor = isOn ? "#f87171" : "#34d399";
  const textColor = isOn ? "#f87171" : "#34d399";

  return (
    <div
      title={`원본 값: ${raw ?? "-"}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 12,
        padding: "4px 0",
        borderBottom: `1px solid ${ROW_BORDER}`,
        cursor: "default",
      }}
    >
      <span style={{ color: TEXT_LABEL }}>{item.label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 500, color: textColor, width: 42, justifyContent: "flex-end" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
        <span style={{ width: 22, textAlign: "right" }}>{isOn ? "ON" : "OFF"}</span>
      </span>
    </div>
  );
}

function DataSection({ section }: { section: Section }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: TEXT_SECTION,
          letterSpacing: 1,
          textTransform: "uppercase",
          padding: "6px 0 4px",
          marginBottom: 2,
          borderBottom: `1.5px solid ${SECTION_BORDER}`,
        }}
      >
        {section.title}
      </div>

      {section.title === "알람" ? (
        /* 알람 섹션 */
        section.items.map((item) => <AlarmRow key={item.tag} item={item} />)
      ) : (() => {
        // 항목별로 twoLine / table 분리
        const items = section.items as (DataItem & { _twoLine?: boolean })[];
        const isSectionTwoLine = section.twoLine;

        return (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                {items.map((item) => {
                  const display = item.val != null && !isNaN(Number(item.val))
                    ? fmt(Number(item.val), 1) : "-";
                  const isTwoLine = isSectionTwoLine || item._twoLine;
                  if (isTwoLine) {
                    return (
                      <tr key={item.tag} style={{ borderBottom: `1px solid ${ROW_BORDER}` }}>
                        <td colSpan={3} style={{ padding: "4px 0" }}>
                          <div style={{ color: TEXT_LABEL }}>{item.label}</div>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <span style={{ fontVariantNumeric: "tabular-nums", color: TEXT_PRIMARY, fontWeight: 500 }}>
                              {display}
                            </span>
                            <span style={{ color: TEXT_UNIT, fontWeight: 400, marginLeft: 4, width: 32, whiteSpace: "nowrap" }}>
                              {item.unit || ""}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={item.tag} style={{ borderBottom: `1px solid ${ROW_BORDER}` }}>
                      <td style={{ color: TEXT_LABEL, padding: "4px 0", whiteSpace: "nowrap" }}>{item.label}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums", color: TEXT_PRIMARY, fontWeight: 500, textAlign: "right", padding: "4px 0" }}>
                        {display}
                      </td>
                      <td style={{ color: TEXT_UNIT, fontWeight: 400, textAlign: "left", padding: "4px 0 4px 4px", width: 32, whiteSpace: "nowrap" }}>
                        {item.unit || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        );
      })()}
    </div>
  );
}

function ConverterCard({ convKey, label }: { convKey: "conv0" | "conv1" | "conv2" | "conv3"; label: string }) {
  const convData = useEmsStore((s) => s.data?.converters?.[convKey]);
  const isTotal = convKey === "conv0";

  const alarms = convData?.alarm ?? [];
  const warningItem = alarms.find((a) => a.tag === "Warning");
  const faultItem = alarms.find((a) => a.tag === "Fault");
  const isWarning = !isTotal && ((Number(warningItem?.val) || 0) >= 1);
  const isFault = !isTotal && ((Number(faultItem?.val) || 0) >= 1);

  // conv0 DC의 "DC출력 유효전력 합계"만 twoLine
  const dcItems = (convData?.dc ?? []).map((item) => ({
    ...item,
    _twoLine: isTotal && item.tag === "Pdc_W",
  }));

  const acSections: Section[] = [
    { title: "AC", items: convData?.ac ?? [] },
    { title: "DC", items: dcItems },
  ];
  const rightSections: Section[] = [
    { title: "전력량", items: convData?.energy ?? [], twoLine: true },
    ...(!isTotal ? [{ title: "온도", items: convData?.temp ?? [] }] : []),
    ...(!isTotal ? [{ title: "알람", items: convData?.alarm ?? [] }] : []),
  ];

  const statusLabel = isFault ? "오류" : isWarning ? "경고" : "정상";
  const statusColor = isFault ? "#f87171" : isWarning ? "#fbbf24" : "#34d399";
  const statusBg = isFault ? "#f8717115" : isWarning ? "#f59e0b15" : "#10b98115";
  const statusBorder = isFault ? "#f8717130" : isWarning ? "#f59e0b30" : "#10b98130";

  return (
    <div
      className="rounded-lg"
      style={{
        background: CARD_BG,
        padding: 14,
        border: `1px solid ${BORDER}60`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>{label}</span>
        {!isTotal && (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 10,
              background: statusBg,
              color: statusColor,
              border: `1px solid ${statusBorder}`,
            }}
          >
            {statusLabel}
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", flex: 1 }}>
        <div>
          {acSections.map((s) => (
            <DataSection key={s.title} section={s} />
          ))}
        </div>
        <div>
          {rightSections.map((s) => (
            <DataSection key={s.title} section={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MonitoringTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, alignItems: "stretch" }}>
      <ConverterCard convKey="conv0" label="AC/DC 컨버터 전체" />
      <ConverterCard convKey="conv1" label="AC/DC 컨버터 1" />
      <ConverterCard convKey="conv2" label="AC/DC 컨버터 2" />
      <ConverterCard convKey="conv3" label="AC/DC 컨버터 3" />
    </div>
  );
}

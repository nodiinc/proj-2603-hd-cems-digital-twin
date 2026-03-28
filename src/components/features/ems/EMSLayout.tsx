"use client";

import { useState, useEffect } from "react";
import { CARD_BG, BORDER } from "@/lib/ems-data";
import { useEmsStore } from "@/lib/ems-store";
import DashboardTab from "./DashboardTab";
import EfficiencyTab from "./EfficiencyTab";
import SupplyTab from "./SupplyTab";
import QualityTab from "./QualityTab";
import MonitoringTab from "./MonitoringTab";
import SettingsTab from "./SettingsTab";

const TOP_TABS = ["DC EMS", "모니터링", "설정"] as const;
const DC_SUB_TABS = ["대시보드", "배전 효율", "전력 수급", "전력 품질"] as const;

type TopTab = (typeof TOP_TABS)[number];
type SubTab = (typeof DC_SUB_TABS)[number];

export default function EMSLayout() {
  const [topTab, setTopTab] = useState<TopTab>("DC EMS");
  const [subTab, setSubTab] = useState<SubTab>("대시보드");
  const { startPolling, stopPolling, error } = useEmsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    startPolling(2000);
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  return (
    <div
      style={{
        width: 1612,
        height: 736,
        overflow: "hidden",
        borderRight: "1px solid #f8717150",
        borderBottom: "1px solid #f8717150",
        background: "#14192D",
        color: "#e2e8f0",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          height: 48,
          minHeight: 48,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 20px",
          background: CARD_BG,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", letterSpacing: -0.3 }}>
            청주배전캠퍼스 DC EMS
          </span>
        </div>
        <div style={{ width: 1, height: 20, background: BORDER }} />
        <nav style={{ display: "flex", gap: 2 }}>
          {TOP_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setTopTab(tab)}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                borderRadius: 6,
                cursor: "pointer",
                border: "none",
                transition: "all 0.15s",
                background: topTab === tab ? "#0ea5e920" : "transparent",
                color: topTab === tab ? "#38bdf8" : "#a8b2c8",
                fontWeight: topTab === tab ? 600 : 400,
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 10,
          padding: "2px 8px",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 5,
          color: !mounted ? "#7080a0" : error ? "#f87171" : "#34d399",
          background: !mounted ? "#7080a015" : error ? "#f8717115" : "#10b98115",
          border: `1px solid ${!mounted ? "#7080a030" : error ? "#f8717130" : "#10b98130"}`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: !mounted ? "#7080a0" : error ? "#f87171" : "#34d399" }} />
          {!mounted ? "연결 확인 중..." : error ? "엣지 게이트웨이 연결 오류" : "엣지 게이트웨이 연결됨"}
        </span>
      </header>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {topTab === "DC EMS" && (
          <>
            {/* Sub-tab bar */}
            <div
              style={{
                display: "flex",
                gap: 2,
                marginBottom: 14,
                background: `${CARD_BG}80`,
                borderRadius: 6,
                padding: 3,
                width: "fit-content",
                border: `1px solid ${BORDER}50`,
              }}
            >
              {DC_SUB_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSubTab(tab)}
                  style={{
                    padding: "5px 14px",
                    fontSize: 12,
                    borderRadius: 4,
                    cursor: "pointer",
                    border: "none",
                    transition: "all 0.15s",
                    background: subTab === tab ? "#0ea5e920" : "transparent",
                    color: subTab === tab ? "#38bdf8" : "#a8b2c8",
                    fontWeight: subTab === tab ? 600 : 400,
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {subTab === "대시보드" && <DashboardTab />}
            {subTab === "배전 효율" && <EfficiencyTab />}
            {subTab === "전력 수급" && <SupplyTab />}
            {subTab === "전력 품질" && <QualityTab />}
          </>
        )}
        {topTab === "모니터링" && <MonitoringTab />}
        {topTab === "설정" && <SettingsTab />}
      </main>
    </div>
  );
}

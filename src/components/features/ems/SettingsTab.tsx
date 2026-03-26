"use client";

import { useEffect, useState, useRef } from "react";
import { CARD_BG, BORDER, TEXT_PRIMARY, TEXT_LABEL } from "@/lib/ems-data";
import { useEmsStore } from "@/lib/ems-store";
import { OPCUA_NODES } from "@/lib/opcua-nodes";

const inputStyle: React.CSSProperties = {
  background: "#1a2038",
  border: `1px solid ${BORDER}60`,
  color: "#e2e8f0",
  height: 30,
  fontSize: 13,
  fontVariantNumeric: "tabular-nums",
  borderRadius: 4,
  padding: "0 8px",
  width: "100%",
};

/** 필드 정의 */
interface FieldDef {
  label: string;
  nodeId: string;
  key: string; // settings 객체의 key
}

function Field({
  label,
  value,
  changed,
  onChange,
}: {
  label: string;
  value: string;
  changed: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, color: TEXT_LABEL, display: "block", marginBottom: 4 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle,
          borderColor: changed ? "#f59e0b80" : `${BORDER}60`,
        }}
      />
    </div>
  );
}

const N = OPCUA_NODES.conf;

const ALL_FIELDS: FieldDef[] = [
  // 설비 사양
  { label: "컨버터1 정격 전력 (kW)", nodeId: N.dc_conv_1_p_rated, key: "conv1_p_rated" },
  { label: "컨버터2 정격 전력 (kW)", nodeId: N.dc_conv_2_p_rated, key: "conv2_p_rated" },
  { label: "컨버터3 정격 전력 (kW)", nodeId: N.dc_conv_3_p_rated, key: "conv3_p_rated" },
  { label: "가상 DC SMPS 정격 전력 (kW)", nodeId: N.simul_dc_smps_p_rated, key: "simul_dc_smps_p_rated" },
  { label: "가상 변압기 정격 전력 (kW)", nodeId: N.simul_ac_tr_p_rated, key: "simul_ac_tr_p_rated" },
  { label: "가상 AC SMPS 정격 전력 (kW)", nodeId: N.simul_ac_smps_p_rated, key: "simul_ac_smps_p_rated" },
  // 손실 상수
  { label: "DC SMPS c2", nodeId: N.simul_dc_smps_loss_c2, key: "simul_dc_smps_loss_c2" },
  { label: "DC SMPS c1", nodeId: N.simul_dc_smps_loss_c1, key: "simul_dc_smps_loss_c1" },
  { label: "DC SMPS c0", nodeId: N.simul_dc_smps_loss_c0, key: "simul_dc_smps_loss_c0" },
  { label: "AC 변압기 c2", nodeId: N.simul_ac_tr_loss_c2, key: "simul_ac_tr_loss_c2" },
  { label: "AC 변압기 c1", nodeId: N.simul_ac_tr_loss_c1, key: "simul_ac_tr_loss_c1" },
  { label: "AC 변압기 c0", nodeId: N.simul_ac_tr_loss_c0, key: "simul_ac_tr_loss_c0" },
  { label: "AC SMPS c2", nodeId: N.simul_ac_smps_loss_c2, key: "simul_ac_smps_loss_c2" },
  { label: "AC SMPS c1", nodeId: N.simul_ac_smps_loss_c1, key: "simul_ac_smps_loss_c1" },
  { label: "AC SMPS c0", nodeId: N.simul_ac_smps_loss_c0, key: "simul_ac_smps_loss_c0" },
  // 효과 상수
  { label: "이산화탄소 배출 계수 (ton/kWh)", nodeId: N.carbon_emission_coeff, key: "carbon_emission_coeff" },
  { label: "탄소 감축 금액 상수 (원/ton)", nodeId: N.carbon_savings_coeff, key: "carbon_savings_coeff" },
];

export default function SettingsTab() {
  const settings = useEmsStore((s) => s.data?.settings);

  // 서버 값 스냅샷 (원복 기준)
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});
  // 로컬 편집 값
  const [local, setLocal] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  // 서버 데이터가 처음 들어오면 스냅샷 & 로컬에 반영
  useEffect(() => {
    if (!settings || initialized.current) return;
    const snap: Record<string, string> = {};
    for (const f of ALL_FIELDS) {
      const v = settings[f.key];
      snap[f.key] = v != null ? String(v) : "";
    }
    setSnapshot(snap);
    setLocal(snap);
    initialized.current = true;
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  // 변경된 필드 찾기
  const changedKeys = ALL_FIELDS.filter((f) => local[f.key] !== snapshot[f.key]);
  const hasChanges = changedKeys.length > 0;

  // 원복
  const handleReset = () => {
    setLocal(snapshot);
  };

  // 적용: 변경된 값만 OPC UA 서버에 쓰기
  const handleApply = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const results = await Promise.all(
        changedKeys.map((f) =>
          fetch("/api/ems/write", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nodeId: f.nodeId, value: Number(local[f.key]) }),
          }).then((r) => r.json()),
        ),
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        setSnapshot({ ...local });
      } else {
        const details = failed.map((r) => r.status || r.error || "unknown").join(", ");
        alert(`${failed.length}건 저장 실패: ${details}`);
        // 성공한 것들은 스냅샷 반영
        const successKeys = changedKeys.filter((_, i) => results[i].ok).map((f) => f.key);
        if (successKeys.length > 0) {
          setSnapshot((prev) => {
            const next = { ...prev };
            for (const k of successKeys) next[k] = local[k];
            return next;
          });
        }
      }
    } catch {
      alert("OPC UA 서버 연결 오류");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (f: FieldDef) => (
    <Field
      key={f.key}
      label={f.label}
      value={local[f.key] ?? ""}
      changed={local[f.key] !== snapshot[f.key]}
      onChange={(v) => handleChange(f.key, v)}
    />
  );

  const specFields = ALL_FIELDS.slice(0, 6);
  const lossFields = ALL_FIELDS.slice(6, 15);
  const effectFields = ALL_FIELDS.slice(15, 17);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 상단 버튼 바 */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          style={{
            padding: "6px 16px",
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 5,
            border: `1px solid ${BORDER}`,
            background: "transparent",
            color: hasChanges ? "#e2e8f0" : "#5a6380",
            cursor: hasChanges ? "pointer" : "default",
            transition: "all 0.15s",
          }}
        >
          복원
        </button>
        <button
          onClick={handleApply}
          disabled={!hasChanges || saving}
          style={{
            padding: "6px 16px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 5,
            border: "none",
            background: hasChanges ? "#0ea5e9" : "#0ea5e940",
            color: hasChanges ? "#fff" : "#ffffff60",
            cursor: hasChanges ? "pointer" : "default",
            transition: "all 0.15s",
          }}
        >
          {saving ? "저장 중..." : `적용${hasChanges ? ` (${changedKeys.length})` : ""}`}
        </button>
      </div>

      {/* 설비 사양 */}
      <div className="rounded-lg" style={{ background: CARD_BG, padding: "12px 16px" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 8 }}>설비 사양</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {specFields.map(renderField)}
        </div>
      </div>

      {/* 손실 상수 */}
      <div className="rounded-lg" style={{ background: CARD_BG, padding: "12px 16px" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 8 }}>손실 상수</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {lossFields.slice(0, 3).map(renderField)}
          <div />
          {lossFields.slice(3, 6).map(renderField)}
          <div />
          {lossFields.slice(6, 9).map(renderField)}
        </div>
      </div>

      {/* 하단 3열 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {/* 효과 상수 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: "12px 16px" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 8 }}>효과 상수</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {effectFields.map(renderField)}
          </div>
        </div>

        {/* 전기 요금 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: "12px 16px" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 8 }}>전기 요금</p>
          <div style={{ padding: 16, borderRadius: 6, border: `1px dashed ${BORDER}`, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: TEXT_LABEL }}>전기 요금 테이블 설정</p>
            <p style={{ fontSize: 10, color: "#5a6a85", marginTop: 4 }}>(TBD — 시간대별/계절별 요금 체계)</p>
          </div>
        </div>

        {/* 이전 기록 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: "12px 16px" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 8 }}>이전 기록</p>
          <div style={{ padding: 16, borderRadius: 6, border: `1px dashed ${BORDER}`, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: TEXT_LABEL }}>이전일 데이터 입력</p>
            <p style={{ fontSize: 10, color: "#5a6a85", marginTop: 4 }}>시작일 명시 후 이전 기간 누적 데이터 수동 입력</p>
          </div>
        </div>
      </div>
    </div>
  );
}

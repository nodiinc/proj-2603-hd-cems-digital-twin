"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { CARD_BG, BORDER, TEXT_PRIMARY, TEXT_LABEL } from "@/lib/ems-data";
import { useEmsStore } from "@/lib/ems-store";
import { OPCUA_NODES } from "@/lib/opcua-nodes";
import TariffEditor, { type TariffData } from "./TariffEditor";

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
  // 설비 사양 - 1행
  { label: "컨버터1 정격 전력 (kW)", nodeId: N.dc_conv_1_p_rated, key: "conv1_p_rated" },
  { label: "컨버터2 정격 전력 (kW)", nodeId: N.dc_conv_2_p_rated, key: "conv2_p_rated" },
  { label: "컨버터3 정격 전력 (kW)", nodeId: N.dc_conv_3_p_rated, key: "conv3_p_rated" },
  { label: "가상 DC SMPS 정격 전력 (kW)", nodeId: N.simul_dc_smps_p_rated, key: "simul_dc_smps_p_rated" },
  // 설비 사양 - 2행
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
  // 대시보드 감축량 기준값
  { label: "누적 전력 감축량 기준값 (kWh)", nodeId: N.reduction_base_energy, key: "reduction_base_energy" },
  { label: "누적 전력 비용 감축량 기준값 (천원)", nodeId: N.reduction_base_energy_cost, key: "reduction_base_energy_cost" },
];

const EMPTY_TARIFF: TariffData = { tariffs: [], times: [] };

export default function SettingsTab() {
  const settings = useEmsStore((s) => s.data?.settings);

  // 전기요금 설정 화면 전환
  const [showTariff, setShowTariff] = useState(false);
  // 전기요금 dirty 상태
  const [tariffDirty, setTariffDirty] = useState(false);
  const [tariffData, setTariffData] = useState<TariffData>(EMPTY_TARIFF);
  const [tariffSnapshot, setTariffSnapshot] = useState<TariffData>(EMPTY_TARIFF);
  const tariffInitialized = useRef(false);

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

    // 전기요금 JSON 로드
    if (!tariffInitialized.current) {
      tariffInitialized.current = true;
      const raw = settings.electricity_rate_tou;
      let parsed: TariffData | null = null;

      if (raw && typeof raw === "string") {
        try {
          const obj = JSON.parse(String(raw));
          if (obj && Array.isArray(obj.tariffs) && Array.isArray(obj.times)) {
            // 이전 형식 정리: start_hour/end_hour 제거, hours 없으면 빈 배열
            obj.times = obj.times.map((t: Record<string, unknown>) => {
              const { start_hour: _s, end_hour: _e, ...rest } = t;
              return { ...rest, hours: Array.isArray(rest.hours) ? rest.hours : [] };
            });
            parsed = obj as TariffData;
          }
        } catch { /* invalid JSON */ }
      }

      if (parsed) {
        setTariffSnapshot(parsed);
        setTariffData(parsed);
      } else {
        // 유효하지 않은 데이터 → 빈 구조로 초기화하고 OPC UA에 자동 writing
        const empty = EMPTY_TARIFF;
        setTariffSnapshot(empty);
        setTariffData(empty);
        fetch("/api/ems/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId: N.electricity_rate_tou, value: JSON.stringify(empty) }),
        }).catch(() => {});
      }
    }
    initialized.current = true;
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  // 변경된 필드 찾기
  const changedKeys = ALL_FIELDS.filter((f) => local[f.key] !== snapshot[f.key]);
  const hasChanges = changedKeys.length > 0 || tariffDirty;

  // 원복
  const handleReset = () => {
    setLocal(snapshot);
    setTariffData(tariffSnapshot);
    setTariffDirty(false);
  };

  // 전기요금 dirty 콜백
  const handleTariffDirtyChange = useCallback((dirty: boolean, data: TariffData) => {
    setTariffDirty(dirty);
    setTariffData(data);
  }, []);

  // 적용: 변경된 값만 OPC UA 서버에 쓰기 + 전기요금 JSON
  const handleApply = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const promises: Promise<{ ok: boolean; status?: string; error?: string }>[] = [];

      // 일반 필드
      for (const f of changedKeys) {
        promises.push(
          fetch("/api/ems/write", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nodeId: f.nodeId, value: Number(local[f.key]) }),
          }).then((r) => r.json()),
        );
      }

      // 전기요금 JSON
      if (tariffDirty) {
        promises.push(
          fetch("/api/ems/write", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nodeId: N.electricity_rate_tou, value: JSON.stringify(tariffData) }),
          }).then((r) => r.json()),
        );
      }

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        setSnapshot({ ...local });
        if (tariffDirty) {
          setTariffSnapshot(tariffData);
          setTariffDirty(false);
        }
      } else {
        const details = failed.map((r) => r.status || r.error || "unknown").join(", ");
        alert(`${failed.length}건 저장 실패: ${details}`);
        // 일반 필드 중 성공한 것들은 스냅샷 반영
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
  const reductionBaseFields = ALL_FIELDS.slice(17, 19);

  // 전기요금 설정 화면
  if (showTariff) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* 상단 버튼 바 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowTariff(false)}
            style={{
              padding: "6px 16px", fontSize: 12, fontWeight: 500, borderRadius: 5,
              border: `1px solid ${BORDER}`, background: "transparent",
              color: "#e2e8f0", cursor: "pointer",
            }}
          >← 설정으로 돌아가기</button>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            style={{
              padding: "6px 16px", fontSize: 12, fontWeight: 500, borderRadius: 5,
              border: `1px solid ${BORDER}`, background: "transparent",
              color: hasChanges ? "#e2e8f0" : "#5a6380",
              cursor: hasChanges ? "pointer" : "default",
            }}
          >복원</button>
          <button
            onClick={handleApply}
            disabled={!hasChanges || saving}
            style={{
              padding: "6px 16px", fontSize: 12, fontWeight: 600, borderRadius: 5,
              border: "none", background: hasChanges ? "#0ea5e9" : "#0ea5e940",
              color: hasChanges ? "#fff" : "#ffffff60",
              cursor: hasChanges ? "pointer" : "default",
            }}
          >{saving ? "저장 중..." : `적용${hasChanges ? ` (${changedKeys.length + (tariffDirty ? 1 : 0)})` : ""}`}</button>
        </div>
        <TariffEditor
          initial={tariffSnapshot}
          onDirtyChange={handleTariffDirtyChange}
        />
      </div>
    );
  }

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
          {/* 1행: 컨버터1~3, DC SMPS */}
          {specFields.slice(0, 4).map(renderField)}
          {/* 2행: 변압기, 빈칸2개, AC SMPS */}
          {renderField(specFields[4])}
          <div />
          <div />
          {renderField(specFields[5])}
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

        {/* 전기요금 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: "12px 16px" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 8 }}>전기요금</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => setShowTariff(true)}
              style={{
                padding: "10px 28px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 5,
                border: `1px solid ${BORDER}`,
                background: "transparent",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              전기요금 설정 →
            </button>
          </div>
          {tariffDirty && (
            <p style={{ fontSize: 10, color: "#f59e0b", marginTop: 6 }}>※ 전기요금 변경사항이 있습니다. 적용 버튼을 눌러주세요.</p>
          )}
        </div>

        {/* 대시보드 감축량 기준값 */}
        <div className="rounded-lg" style={{ background: CARD_BG, padding: "12px 16px" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 8 }}>대시보드 감축량 기준값</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reductionBaseFields.map(renderField)}
          </div>
          <p style={{ fontSize: 10, color: "#5a6a85", marginTop: 10 }}>
            ※ 누적 탄소 감축량, 누적 탄소 비용 감축량은 누적 전력 감축량에 기반하여 자동 계산됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

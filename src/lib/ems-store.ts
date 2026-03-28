"use client";

import { create } from "zustand";

// ─── 데이터 타입 (API 응답과 동일) ───────────────────────────────────────────

export interface DataItem {
  tag: string;
  label: string;
  unit: string;
  val: number | boolean | string | null;
}

export interface ConverterData {
  ac: DataItem[];
  dc: DataItem[];
  energy: DataItem[];
  temp: DataItem[];
  alarm: DataItem[];
}

export interface StackData {
  name: string;
  rated: number | null;
  used: number | null;
}

export interface EmsData {
  converters: {
    conv0: ConverterData;
    conv1: ConverterData;
    conv2: ConverterData;
    conv3: ConverterData;
  };
  dashboard: {
    reduction_energy: number | null;
    reduction_carbon: number | null;
    reduction_energy_cost: number | null;
    reduction_carbon_cost: number | null;
    dc_eff: number | null;
    ac_eff: number | null;
  };
  efficiency: {
    dc: {
      conv_in_p: number | null;
      conv_in_v: number | null;
      conv_eff: number | null;
      conv_out_p: number | null;
      conv_out_v: number | null;
      smps_eff: number | null;
      smps_out_p: number | null;
      total_eff: number | null;
    };
    ac: {
      tr_in_p: number | null;
      tr_in_v: number | null;
      tr_eff: number | null;
      tr_out_p: number | null;
      tr_out_v: number | null;
      smps_eff: number | null;
      smps_out_p: number | null;
      total_eff: number | null;
    };
  };
  supply: {
    total_rated: number | null;
    total_used: number | null;
    reserve_margin: number | null;
    stacks: StackData[];
  };
  quality: {
    ac_voltage: number | null;
    ac_v_diff: number | null;
    ac_v_diff_yesterday: number | null;
    dc_voltage: number | null;
    dc_v_diff: number | null;
    dc_v_diff_yesterday: number | null;
    ac_v_swing_yesterday: number | null;
    dc_v_swing_yesterday: number | null;
    pf: number | null;
    v_unbal: number | null;
  };
  settings: Record<string, number | null>;
  _ts: number;
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface EmsStore {
  data: EmsData | null;
  loading: boolean;
  error: string | null;
  /** 폴링 interval ID */
  _intervalId: ReturnType<typeof setInterval> | null;
  /** 데이터 1회 fetch */
  fetch: () => Promise<void>;
  /** 폴링 시작 (ms 간격) */
  startPolling: (intervalMs?: number) => void;
  /** 폴링 중지 */
  stopPolling: () => void;
}

export const useEmsStore = create<EmsStore>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  _intervalId: null,

  fetch: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/ems/data");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EmsData = await res.json();
      set({ data, error: null });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ loading: false });
    }
  },

  startPolling: (intervalMs = 2000) => {
    const { _intervalId, fetch: fetchFn } = get();
    if (_intervalId) return; // 이미 폴링 중
    fetchFn(); // 즉시 1회
    const id = setInterval(fetchFn, intervalMs);
    set({ _intervalId: id });
  },

  stopPolling: () => {
    const { _intervalId } = get();
    if (_intervalId) {
      clearInterval(_intervalId);
      set({ _intervalId: null });
    }
  },
}));

// ─── 숫자 포맷 헬퍼 ─────────────────────────────────────────────────────────

/** null이면 "-" 반환, 아니면 지정 소수점으로 포맷 */
export function fmt(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return "-";
  return Number(val).toFixed(decimals);
}

/** W 단위를 kW로 변환하여 포맷 */
export function fmtKw(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return "-";
  return (Number(val) / 1000).toFixed(decimals);
}

/** boolean/숫자를 ON/OFF로 변환 */
export function fmtBool(val: number | boolean | string | null): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "boolean") return val ? "ON" : "OFF";
  if (typeof val === "number") return val ? "ON" : "OFF";
  return String(val);
}

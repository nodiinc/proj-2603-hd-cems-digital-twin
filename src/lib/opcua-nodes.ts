/**
 * OPC UA Node ID 매핑
 *
 * 네임스페이스는 환경변수 또는 기본값으로 설정.
 * 서버 사이드 사이트 설정 함수는 site-config.ts에서 직접 사용.
 */

/** 기본 네임스페이스 (환경변수로 오버라이드 가능) */
const NS = process.env.OPCUA_NAMESPACE ?? "ns=1;s=/dc_conv";

/** 태그 경로 → OPC UA 노드 ID */
function n(tag: string): string {
  return `${NS}${tag}`;
}

// ─── 컨버터별 모니터링 (base) ────────────────────────────────────────────────

function converterBaseNodes(idx: 1 | 2 | 3) {
  const c = `dc_conv_${idx}`;
  return {
    // AC 입력
    ac_in: {
      v_ab: n(`/base/${c}/ac_in/v_ab`),
      v_bc: n(`/base/${c}/ac_in/v_bc`),
      v_ca: n(`/base/${c}/ac_in/v_ca`),
      v: n(`/base/${c}/ac_in/v`),
      v_diff: n(`/base/${c}/ac_in/v_diff`),
      v_unbal: n(`/base/${c}/ac_in/v_unbal`),
      f: n(`/base/${c}/ac_in/f`),
      i_a: n(`/base/${c}/ac_in/i_a`),
      i_b: n(`/base/${c}/ac_in/i_b`),
      i_c: n(`/base/${c}/ac_in/i_c`),
      i: n(`/base/${c}/ac_in/i`),
      p: n(`/base/${c}/ac_in/p`),
      q: n(`/base/${c}/ac_in/q`),
      s: n(`/base/${c}/ac_in/s`),
      pf: n(`/base/${c}/ac_in/pf`),
    },
    // DC 링크
    dc_link: {
      v: n(`/base/${c}/dc_link/v`),
      i: n(`/base/${c}/dc_link/i`),
    },
    // DC 출력
    dc_out: {
      v: n(`/base/${c}/dc_out/v`),
      i: n(`/base/${c}/dc_out/i`),
      p: n(`/base/${c}/dc_out/p`),
    },
    // 전력량
    energy: {
      rcv_day: n(`/base/${c}/energy/rcv_day`),
      trs_day: n(`/base/${c}/energy/trs_day`),
      rcv_mth: n(`/base/${c}/energy/rcv_mth`),
      trs_mth: n(`/base/${c}/energy/trs_mth`),
      rcv_tot: n(`/base/${c}/energy/rcv_tot`),
      trs_tot: n(`/base/${c}/energy/trs_tot`),
    },
    // 온도
    temp: {
      igbt: n(`/base/${c}/temp/igbt`),
      tr: n(`/base/${c}/temp/tr`),
    },
    // 상태
    status: {
      warning: n(`/base/${c}/status/warning`),
      fault: n(`/base/${c}/status/fault`),
      status: n(`/base/${c}/status/status`),
    },
  };
}

// ─── 컨버터 전체 합산 (conv_0 = 3대 합산/평균) ──────────────────────────────

const conv0 = {
  ac_in: {
    v: n("/base/dc_conv_0/ac_in/v"),
    v_diff: n("/base/dc_conv_0/ac_in/v_diff"),
    v_unbal: n("/base/dc_conv_0/ac_in/v_unbal"),
    f: n("/base/dc_conv_0/ac_in/f"),
    i: n("/base/dc_conv_0/ac_in/i"),
    p: n("/base/dc_conv_0/ac_in/p"),
    q: n("/base/dc_conv_0/ac_in/q"),
    s: n("/base/dc_conv_0/ac_in/s"),
    pf: n("/base/dc_conv_0/ac_in/pf"),
  },
  dc_link: {
    v: n("/base/dc_conv_0/dc_link/v"),
    i: n("/base/dc_conv_0/dc_link/i"),
  },
  dc_out: {
    v: n("/base/dc_conv_0/dc_out/v"),
    v_diff: n("/base/dc_conv_0/dc_out/v_diff"),
    i: n("/base/dc_conv_0/dc_out/i"),
    p: n("/base/dc_conv_0/dc_out/p"),
  },
  energy: {
    rcv_day: n("/base/dc_conv_0/energy/rcv_day"),
    trs_day: n("/base/dc_conv_0/energy/trs_day"),
    rcv_mth: n("/base/dc_conv_0/energy/rcv_mth"),
    trs_mth: n("/base/dc_conv_0/energy/trs_mth"),
    rcv_tot: n("/base/dc_conv_0/energy/rcv_tot"),
    trs_tot: n("/base/dc_conv_0/energy/trs_tot"),
  },
};

// ─── 계산 값 (calc) ─────────────────────────────────────────────────────────

const calc = {
  // 대시보드 KPI
  dashboard: {
    reduction_energy: n("/calc/dashboard/reduction_perf/energy"),
    reduction_carbon: n("/calc/dashboard/reduction_perf/carbon"),
    reduction_energy_cost: n("/calc/dashboard/reduction_perf/energy_cost"),
    reduction_carbon_cost: n("/calc/dashboard/reduction_perf/carbon_cost"),
  },
  // DC 시뮬레이션 (실제 DC 배전)
  simul_dc: {
    conv_eff: n("/calc/simul_dc/self/conv_eff"),
    smps_conv_eff: n("/calc/simul_dc/smps/conv_eff"),
    smps_out_p: n("/calc/simul_dc/smps_out/p"),
  },
  // AC 시뮬레이션 (가상 AC 배전)
  simul_ac: {
    conv_eff: n("/calc/simul_ac/self/conv_eff"),
    tr_in_p: n("/calc/simul_ac/tr_in/p"),
    tr_in_v: n("/calc/simul_ac/tr_in/v"),
    tr_conv_eff: n("/calc/simul_ac/tr/conv_eff"),
    tr_out_p: n("/calc/simul_ac/tr_out/p"),
    tr_out_v: n("/calc/simul_ac/tr_out/v"),
    smps_conv_eff: n("/calc/simul_ac/smps/conv_eff"),
    smps_out_p: n("/calc/simul_ac/smps_out/p"),
  },
  // 컨버터 전체 계산
  dc_conv_0: {
    conv_eff: n("/calc/dc_conv_0/self/conv_eff"),
    p_rated: n("/calc/dc_conv_0/self/p_rated"),
    reserve_margin: n("/calc/dc_conv_0/self/reserve_margin"),
    ac_in_v_diff_yesterday: n("/calc/dc_conv_0/ac_in/v_diff_yesterday"),
    dc_out_v_diff_yesterday: n("/calc/dc_conv_0/dc_out/v_diff_yesterday"),
    ac_in_v_swing_yesterday: n("/calc/dc_conv_0/ac_in/v_swing_yesterday"),
    dc_out_v_swing_yesterday: n("/calc/dc_conv_0/dc_out/v_swing_yesterday"),
  },
};

// ─── 설정 (conf) ────────────────────────────────────────────────────────────

const conf = {
  dc_conv_1_p_rated: n("/conf/dc_conv_1/self/p_rated"),
  dc_conv_2_p_rated: n("/conf/dc_conv_2/self/p_rated"),
  dc_conv_3_p_rated: n("/conf/dc_conv_3/self/p_rated"),
  simul_dc_smps_p_rated: n("/conf/simul_dc/smps/p_rated"),
  simul_dc_smps_loss_c2: n("/conf/simul_dc/smps/loss_coeff_c2"),
  simul_dc_smps_loss_c1: n("/conf/simul_dc/smps/loss_coeff_c1"),
  simul_dc_smps_loss_c0: n("/conf/simul_dc/smps/loss_coeff_c0"),
  simul_ac_tr_p_rated: n("/conf/simul_ac/tr/p_rated"),
  simul_ac_tr_loss_c2: n("/conf/simul_ac/tr/loss_coeff_c2"),
  simul_ac_tr_loss_c1: n("/conf/simul_ac/tr/loss_coeff_c1"),
  simul_ac_tr_loss_c0: n("/conf/simul_ac/tr/loss_coeff_c0"),
  simul_ac_smps_p_rated: n("/conf/simul_ac/smps/p_rated"),
  simul_ac_smps_loss_c2: n("/conf/simul_ac/smps/loss_coeff_c2"),
  simul_ac_smps_loss_c1: n("/conf/simul_ac/smps/loss_coeff_c1"),
  simul_ac_smps_loss_c0: n("/conf/simul_ac/smps/loss_coeff_c0"),
  carbon_emission_coeff: n("/conf/dashboard/reduction_perf/carbon_emission_coeff"),
  carbon_savings_coeff: n("/conf/dashboard/reduction_perf/carbon_savings_coeff"),
};

// ─── Export ─────────────────────────────────────────────────────────────────

export const OPCUA_NODES = {
  conv1: converterBaseNodes(1),
  conv2: converterBaseNodes(2),
  conv3: converterBaseNodes(3),
  conv0,
  calc,
  conf,
} as const;

/** 전체 노드 ID를 flat 배열로 수집 (API에서 일괄 읽기용) */
export function collectAllNodeIds(obj: unknown): string[] {
  const ids: string[] = [];
  function walk(o: unknown) {
    if (typeof o === "string") {
      ids.push(o);
    } else if (o && typeof o === "object") {
      Object.values(o as Record<string, unknown>).forEach(walk);
    }
  }
  walk(obj);
  return ids;
}

import { readAllNodes, isConnected } from "@/lib/opcua-client";
import { OPCUA_NODES } from "@/lib/opcua-nodes";

export const dynamic = "force-dynamic";

/**
 * GET /api/ems/data
 *
 * OPC UA 서버에서 전체 노드를 읽어서 구조화된 JSON으로 반환한다.
 * 프런트엔드에서 1~2초 간격으로 폴링한다.
 */
export async function GET() {
  try {
    const raw = await readAllNodes();

    /** 노드 ID로 값 조회하는 헬퍼 */
    function v(nodeId: string): number | boolean | string | null {
      return raw[nodeId] ?? null;
    }

    function num(nodeId: string): number | null {
      const val = raw[nodeId];
      if (val === null || val === undefined) return null;
      const n = typeof val === "number" ? val : Number(val);
      return isNaN(n) ? null : n;
    }

    /** 컨버터 모니터링 데이터 빌드 */
    function buildConverter(nodes: typeof OPCUA_NODES.conv1) {
      return {
        ac: [
          { tag: "Vab", label: "전압 A-B상", unit: "V", val: num(nodes.ac_in.v_ab) },
          { tag: "Vbc", label: "전압 B-C상", unit: "V", val: num(nodes.ac_in.v_bc) },
          { tag: "Vca", label: "전압 C-A상", unit: "V", val: num(nodes.ac_in.v_ca) },
          { tag: "Hz", label: "주파수", unit: "Hz", val: num(nodes.ac_in.f) },
          { tag: "Ia", label: "전류 A상", unit: "A", val: num(nodes.ac_in.i_a) },
          { tag: "Ib", label: "전류 B상", unit: "A", val: num(nodes.ac_in.i_b) },
          { tag: "Ic", label: "전류 C상", unit: "A", val: num(nodes.ac_in.i_c) },
          { tag: "W", label: "유효전력", unit: "kW", val: num(nodes.ac_in.p) },
          { tag: "Var_1", label: "무효전력", unit: "kvar", val: num(nodes.ac_in.q) },
          { tag: "VA", label: "피상전력", unit: "kVA", val: num(nodes.ac_in.s) },
          { tag: "PF", label: "역률", unit: "%", val: num(nodes.ac_in.pf) },
        ],
        dc: [
          { tag: "Vdc_Link", label: "DC링크 전압", unit: "V", val: num(nodes.dc_link.v) },
          { tag: "Idc_Link", label: "DC링크 전류", unit: "A", val: num(nodes.dc_link.i) },
          { tag: "Vdc_Out", label: "DC출력 전압", unit: "V", val: num(nodes.dc_out.v) },
          { tag: "Idc_Out", label: "DC출력 전류", unit: "A", val: num(nodes.dc_out.i) },
          { tag: "Pdc_W", label: "DC출력 유효전력", unit: "kW", val: num(nodes.dc_out.p) },
        ],
        energy: [
          { tag: "DAY_kWh_R", label: "일간 수전 유효전력량", unit: "kWh", val: num(nodes.energy.rcv_day) },
          { tag: "DAY_kWh_T", label: "일간 송전 유효전력량", unit: "kWh", val: num(nodes.energy.trs_day) },
          { tag: "MONTH_kWh_R", label: "월간 수전 유효전력량", unit: "kWh", val: num(nodes.energy.rcv_mth) },
          { tag: "MONTH_kWh_T", label: "월간 송전 유효전력량", unit: "kWh", val: num(nodes.energy.trs_mth) },
          { tag: "Total_MWh_R", label: "전체 수전 유효전력량", unit: "MWh", val: num(nodes.energy.rcv_tot) },
          { tag: "Total_MWh_T", label: "전체 송전 유효전력량", unit: "MWh", val: num(nodes.energy.trs_tot) },
        ],
        temp: [
          { tag: "TEMP_IGBT", label: "IGBT 온도", unit: "°C", val: num(nodes.temp.igbt) },
          { tag: "TEMP_TRANS", label: "변압기 온도", unit: "°C", val: num(nodes.temp.tr) },
        ],
        alarm: [
          { tag: "Warning", label: "경고", unit: "", val: v(nodes.status.warning) },
          { tag: "Fault", label: "오류", unit: "", val: v(nodes.status.fault) },
          { tag: "Status", label: "상태", unit: "", val: v(nodes.status.status) },
        ],
      };
    }

    const N = OPCUA_NODES;

    const data = {
      // 모니터링 탭: 컨버터별
      converters: {
        conv0: {
          ac: [
            { tag: "V", label: "전압 평균", unit: "V", val: num(N.conv0.ac_in.v) },
            { tag: "V_diff", label: "전압 편차 최대", unit: "V", val: num(N.conv0.ac_in.v_diff) },
            { tag: "V_unbal", label: "전압 불평형율", unit: "%", val: num(N.conv0.ac_in.v_unbal) },
            { tag: "Hz", label: "주파수 평균", unit: "Hz", val: num(N.conv0.ac_in.f) },
            { tag: "I", label: "전류 합계", unit: "A", val: num(N.conv0.ac_in.i) },
            { tag: "W", label: "유효전력 합계", unit: "kW", val: num(N.conv0.ac_in.p) },
            { tag: "Var_1", label: "무효전력 합계", unit: "kvar", val: num(N.conv0.ac_in.q) },
            { tag: "VA", label: "피상전력 합계", unit: "kVA", val: num(N.conv0.ac_in.s) },
            { tag: "PF", label: "역률 평균", unit: "%", val: num(N.conv0.ac_in.pf) },
          ],
          dc: [
            { tag: "Vdc_Link", label: "DC링크 전압 평균", unit: "V", val: num(N.conv0.dc_link.v) },
            { tag: "Idc_Link", label: "DC링크 전류 합계", unit: "A", val: num(N.conv0.dc_link.i) },
            { tag: "Vdc_Out", label: "DC출력 전압 평균", unit: "V", val: num(N.conv0.dc_out.v) },
            { tag: "Idc_Out", label: "DC출력 전류 합계", unit: "A", val: num(N.conv0.dc_out.i) },
            { tag: "Pdc_W", label: "DC출력 유효전력 합계", unit: "kW", val: num(N.conv0.dc_out.p) },
          ],
          energy: [
            { tag: "DAY_kWh_R", label: "일간 수전 유효전력량 합계", unit: "kWh", val: num(N.conv0.energy.rcv_day) },
            { tag: "DAY_kWh_T", label: "일간 송전 유효전력량 합계", unit: "kWh", val: num(N.conv0.energy.trs_day) },
            { tag: "MONTH_kWh_R", label: "월간 수전 유효전력량 합계", unit: "kWh", val: num(N.conv0.energy.rcv_mth) },
            { tag: "MONTH_kWh_T", label: "월간 송전 유효전력량 합계", unit: "kWh", val: num(N.conv0.energy.trs_mth) },
            { tag: "Total_MWh_R", label: "전체 수전 유효전력량 합계", unit: "MWh", val: num(N.conv0.energy.rcv_tot) },
            { tag: "Total_MWh_T", label: "전체 송전 유효전력량 합계", unit: "MWh", val: num(N.conv0.energy.trs_tot) },
          ],
          temp: [],
          alarm: [],
        },
        conv1: buildConverter(N.conv1),
        conv2: buildConverter(N.conv2),
        conv3: buildConverter(N.conv3),
      },

      // 대시보드 탭: KPI
      dashboard: {
        reduction_energy: num(N.calc.dashboard.reduction_energy),
        reduction_carbon: num(N.calc.dashboard.reduction_carbon),
        reduction_energy_cost: num(N.calc.dashboard.reduction_energy_cost),
        reduction_carbon_cost: num(N.calc.dashboard.reduction_carbon_cost),
        dc_eff: num(N.calc.simul_dc.conv_eff),
        ac_eff: num(N.calc.simul_ac.conv_eff),
      },

      // 배전 효율 탭
      efficiency: {
        dc: {
          conv_in_p: num(N.conv0.ac_in.p),
          conv_in_v: num(N.conv0.ac_in.v),
          conv_eff: num(N.calc.dc_conv_0.conv_eff),
          conv_out_p: num(N.conv0.dc_out.p),
          conv_out_v: num(N.conv0.dc_out.v),
          smps_eff: num(N.calc.simul_dc.smps_conv_eff),
          smps_out_p: num(N.calc.simul_dc.smps_out_p),
          total_eff: num(N.calc.simul_dc.conv_eff),
        },
        ac: {
          tr_in_p: num(N.calc.simul_ac.tr_in_p),
          tr_in_v: num(N.calc.simul_ac.tr_in_v),
          tr_eff: num(N.calc.simul_ac.tr_conv_eff),
          tr_out_p: num(N.calc.simul_ac.tr_out_p),
          tr_out_v: num(N.calc.simul_ac.tr_out_v),
          smps_eff: num(N.calc.simul_ac.smps_conv_eff),
          smps_out_p: num(N.calc.simul_ac.smps_out_p),
          total_eff: num(N.calc.simul_ac.conv_eff),
        },
      },

      // 전력 수급 탭
      supply: {
        total_rated: num(N.calc.dc_conv_0.p_rated),
        total_used: num(N.conv0.dc_out.p),
        reserve_margin: num(N.calc.dc_conv_0.reserve_margin),
        stacks: [
          {
            name: "컨버터1",
            rated: num(N.conf.dc_conv_1_p_rated),
            used: num(N.conv1.dc_out.p),
          },
          {
            name: "컨버터2",
            rated: num(N.conf.dc_conv_2_p_rated),
            used: num(N.conv2.dc_out.p),
          },
          {
            name: "컨버터3",
            rated: num(N.conf.dc_conv_3_p_rated),
            used: num(N.conv3.dc_out.p),
          },
        ],
      },

      // 전력 품질 탭
      quality: {
        ac_voltage: num(N.conv0.ac_in.v),
        ac_v_diff: num(N.conv0.ac_in.v_diff),
        ac_v_diff_yesterday: num(N.calc.dc_conv_0.ac_in_v_diff_yesterday),
        dc_voltage: num(N.conv0.dc_out.v),
        dc_v_diff: num(N.conv0.dc_out.v_diff),
        dc_v_diff_yesterday: num(N.calc.dc_conv_0.dc_out_v_diff_yesterday),
        ac_v_swing_yesterday: num(N.calc.dc_conv_0.ac_in_v_swing_yesterday),
        dc_v_swing_yesterday: num(N.calc.dc_conv_0.dc_out_v_swing_yesterday),
        pf: num(N.conv0.ac_in.pf),
        v_unbal: num(N.conv0.ac_in.v_unbal),
      },

      // 설정 탭
      settings: {
        conv1_p_rated: num(N.conf.dc_conv_1_p_rated),
        conv2_p_rated: num(N.conf.dc_conv_2_p_rated),
        conv3_p_rated: num(N.conf.dc_conv_3_p_rated),
        simul_dc_smps_p_rated: num(N.conf.simul_dc_smps_p_rated),
        simul_ac_tr_p_rated: num(N.conf.simul_ac_tr_p_rated),
        simul_ac_smps_p_rated: num(N.conf.simul_ac_smps_p_rated),
        simul_dc_smps_loss_c2: num(N.conf.simul_dc_smps_loss_c2),
        simul_dc_smps_loss_c1: num(N.conf.simul_dc_smps_loss_c1),
        simul_dc_smps_loss_c0: num(N.conf.simul_dc_smps_loss_c0),
        simul_ac_tr_loss_c2: num(N.conf.simul_ac_tr_loss_c2),
        simul_ac_tr_loss_c1: num(N.conf.simul_ac_tr_loss_c1),
        simul_ac_tr_loss_c0: num(N.conf.simul_ac_tr_loss_c0),
        simul_ac_smps_loss_c2: num(N.conf.simul_ac_smps_loss_c2),
        simul_ac_smps_loss_c1: num(N.conf.simul_ac_smps_loss_c1),
        simul_ac_smps_loss_c0: num(N.conf.simul_ac_smps_loss_c0),
        carbon_emission_coeff: num(N.conf.carbon_emission_coeff),
        carbon_savings_coeff: num(N.conf.carbon_savings_coeff),
        reduction_base_energy: num(N.conf.reduction_base_energy),
        reduction_base_energy_cost: num(N.conf.reduction_base_energy_cost),
      },

      _ts: Date.now(),
      _connected: isConnected(),
    };

    return Response.json(data);
  } catch (err) {
    console.error("[API /ems/data] error:", err);
    return Response.json(
      { error: "OPC UA 서버 연결 실패", detail: String(err) },
      { status: 503 },
    );
  }
}

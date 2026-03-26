# 멀티사이트 운용 전략

## 개요

본 디지털트윈 시스템은 하나의 Next.js 프로세스로 여러 사업장(사이트)을 서비스한다.
사이트별로 다른 설정(OPC UA 주소, InfluxDB, 설비 구성 등)은 JSON 설정 파일로 분리하고,
RGW(Routing Gateway)가 JWT 토큰의 `inloNo`를 기반으로 적절한 사이트로 라우팅한다.

## 아키텍처

```
CEMS (iframe)
  │  cemsToken=<JWT>
  ▼
RGW (포트 20200)
  │  JWT → inloNo 추출
  │  302 Redirect → http://127.0.0.1:20300/?siteId=<inloNo>
  ▼
Next.js (포트 20300) ── 단일 프로세스
  │  siteId → sites/<siteId>.json 로드
  │
  ├─ OPC UA API (/api/ems/data)    → 사이트별 OPC UA 서버
  ├─ InfluxDB API (/api/ems/history) → 사이트별 InfluxDB
  └─ UI 컴포넌트                    → 공통 (설정만 다름)
```

## 사이트 설정 구조

각 사이트는 `sites/<inloNo>.json` 파일로 정의된다.

```json
{
  "siteId": 100,
  "name": "청주배전캠퍼스",
  "description": "DC 배전 시스템 디지털트윈",

  "opcua": {
    "endpoint": "opc.tcp://10.137.202.25:4840/",
    "namespace": "ns=1;s=/dc_conv"
  },

  "influxdb": {
    "host": "10.137.202.25",
    "port": 8086,
    "username": "root",
    "password": "root",
    "database": "nodi",
    "measurement": "dc-conv",
    "retentionPolicy": "autogen",
    "timezoneOffsetHours": 9
  },

  "converters": {
    "count": 3,
    "prefix": "dc_conv"
  }
}
```

## 사이트 추가 절차

1. `sites/<새 inloNo>.json` 파일 생성
2. RGW `config.py`의 `ROUTE_TABLE` 환경변수에 매핑 추가
   ```
   ROUTE_TABLE=100=http://127.0.0.1:20300,200=http://127.0.0.1:20300
   ```
3. Next.js 재시작 불필요 (동적 로딩)

## 사이트별로 다른 것

| 항목 | 설명 | 설정 위치 |
|------|------|-----------|
| OPC UA 엔드포인트 | 사이트 게이트웨이 주소 | `opcua.endpoint` |
| OPC UA 네임스페이스 | 노드 ID 접두사 | `opcua.namespace` |
| InfluxDB 접속 정보 | 호스트, 포트, 인증, DB명 | `influxdb.*` |
| InfluxDB 측정명 | measurement 이름 | `influxdb.measurement` |
| 타임존 오프셋 | KST=9 등 | `influxdb.timezoneOffsetHours` |
| 컨버터 수 | 사이트 설비 규모 | `converters.count` |

## 사이트 간 공통인 것

- UI 컴포넌트 (DashboardTab, MonitoringTab 등)
- 차트 로직 (recharts 기반)
- API 라우트 구조 (/api/ems/data, /api/ems/history, /api/ems/write)
- EMS 스토어 (Zustand)
- OPC UA 클라이언트 로직

## 확장 계획

| 단계 | 사이트 수 | 방식 |
|------|----------|------|
| 현재 | 1~10 | 단일 프로세스 + JSON 설정 |
| 중기 | 10~50 | Docker 컨테이너 + Traefik |
| 장기 | 50+ | Kubernetes + 자동 스케일링 |

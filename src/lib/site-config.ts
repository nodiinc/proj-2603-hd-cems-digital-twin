/**
 * 사이트 설정 로더 (서버 사이드 전용)
 *
 * sites/<siteId>.json 파일을 읽어 사이트별 설정을 반환한다.
 * 결과는 메모리 캐시하여 파일 I/O를 최소화한다.
 */

import fs from "fs";
import path from "path";

export interface SiteConfig {
  siteId: number;
  name: string;
  description: string;
  opcua: {
    endpoint: string;
    namespace: string;
  };
  influxdb: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    measurement: string;
    retentionPolicy: string;
    timezoneOffsetHours: number;
  };
  converters: {
    count: number;
    prefix: string;
  };
}

const DEFAULT_SITE_ID = 100;
const cache = new Map<number, SiteConfig>();

function sitesDir(): string {
  return path.join(process.cwd(), "sites");
}

/**
 * siteId에 해당하는 설정을 로드한다.
 * 파일이 없으면 null을 반환한다.
 */
export function loadSiteConfig(siteId: number): SiteConfig | null {
  if (cache.has(siteId)) return cache.get(siteId)!;

  const filePath = path.join(sitesDir(), `${siteId}.json`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const config: SiteConfig = JSON.parse(raw);
  cache.set(siteId, config);
  return config;
}

/**
 * 요청의 siteId 쿼리 파라미터 또는 기본값으로 설정을 로드한다.
 */
export function getSiteConfig(siteId?: string | number | null): SiteConfig {
  const id = siteId ? Number(siteId) : DEFAULT_SITE_ID;
  const config = loadSiteConfig(id);
  if (!config) {
    throw new Error(`사이트 설정을 찾을 수 없습니다: sites/${id}.json`);
  }
  return config;
}

/**
 * 등록된 모든 사이트 ID 목록을 반환한다.
 */
export function listSiteIds(): number[] {
  const dir = sitesDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => Number(f.replace(".json", "")))
    .filter((n) => !isNaN(n));
}

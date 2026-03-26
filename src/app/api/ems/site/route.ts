import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * GET /api/ems/site?siteId=100
 *
 * 프론트엔드에서 사이트명, 컨버터 수 등 UI 표시에 필요한 정보를 가져온다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");

  try {
    const cfg = getSiteConfig(siteId ? Number(siteId) : undefined);
    return Response.json({
      siteId: cfg.siteId,
      name: cfg.name,
      description: cfg.description,
      converterCount: cfg.converters.count,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 404 });
  }
}

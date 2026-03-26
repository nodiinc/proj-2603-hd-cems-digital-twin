import { writeNode } from "@/lib/opcua-client";

export const dynamic = "force-dynamic";

/**
 * POST /api/ems/write
 * body: { nodeId: string, value: number }
 *
 * 설정 탭에서 conf 노드에 값을 쓸 때 사용.
 * 노드의 현재 데이터 타입을 자동 감지하여 맞춤.
 */
export async function POST(request: Request) {
  try {
    const { nodeId, value } = await request.json();

    if (typeof nodeId !== "string" || !nodeId.startsWith("ns=1;s=/dc_conv/conf/")) {
      return Response.json({ error: "conf 노드만 쓰기 가능합니다." }, { status: 400 });
    }

    const result = await writeNode(nodeId, Number(value));
    return Response.json(result);
  } catch (err) {
    console.error("[API /ems/write] error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { extractVideoId, fetchVideoMeta } from "@/lib/youtube";

export const runtime = "nodejs";

// 채널명·제목 조회 (oEmbed). 이미 저장된 레시피의 채널명 백필용.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const videoId = extractVideoId(id);
  if (!videoId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const meta = await fetchVideoMeta(videoId);
  return NextResponse.json({ ok: true, ...meta });
}

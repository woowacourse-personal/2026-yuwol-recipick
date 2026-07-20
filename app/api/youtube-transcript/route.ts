import { NextRequest, NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";
import { fetchTranscript, NoTranscriptError } from "@/lib/transcript";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다" }, { status: 400 });
  }

  const videoId = extractVideoId(body.url ?? "");
  if (!videoId) {
    return NextResponse.json(
      { ok: false, error: "현재는 유튜브만 지원합니다", code: "unsupported_source" },
      { status: 400 },
    );
  }

  try {
    const segments = await fetchTranscript(videoId);
    return NextResponse.json({ ok: true, videoId, segments });
  } catch (err) {
    if (err instanceof NoTranscriptError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: "no_transcript" },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "자막을 가져오지 못했습니다", code: "server_error" },
      { status: 500 },
    );
  }
}

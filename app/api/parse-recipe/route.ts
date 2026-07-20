import { NextRequest, NextResponse } from "next/server";
import { extractVideoId, fetchVideoMeta } from "@/lib/youtube";
import { fetchTranscript, transcriptToPrompt, NoTranscriptError } from "@/lib/transcript";
import {
  parseRecipeFromTranscript,
  parseRecipeFromText,
  ParseFailedError,
  LlmConfigError,
} from "@/lib/parse";
import type { ParsedRecipe } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

// 동일 URL 캐싱 (API 비용 절감 — §16). 프로토타입: 프로세스 인메모리.
const cache = new Map<string, { recipe: ParsedRecipe; videoId: string }>();

export async function POST(req: NextRequest) {
  let body: {
    url?: string;
    videoTitle?: string;
    channelName?: string;
    text?: string;
    title?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "잘못된 요청입니다", code: "invalid_url" },
      { status: 400 },
    );
  }

  // 텍스트 모드: 자유 형식 레시피 글을 파싱한다 (자막 없는 영상 대안 / 붙여넣기 입력).
  const text = body.text?.trim() ?? "";
  if (text) {
    if (text.length < 10) {
      return NextResponse.json(
        { ok: false, error: "레시피 내용이 너무 짧습니다", code: "parse_failed" },
        { status: 422 },
      );
    }
    try {
      const recipe = await parseRecipeFromText({
        text,
        title: body.title,
        sourceName: body.url,
      });
      return NextResponse.json({ ok: true, recipe, sourceType: "text" });
    } catch (err) {
      return errorResponse(err);
    }
  }

  const videoId = extractVideoId(body.url ?? "");
  if (!videoId) {
    return NextResponse.json(
      { ok: false, error: "현재는 유튜브만 지원합니다", code: "unsupported_source" },
      { status: 400 },
    );
  }

  const cached = cache.get(videoId);
  if (cached) {
    return NextResponse.json({ ok: true, ...cached, cached: true });
  }

  try {
    // oEmbed로 채널명·제목 확보 (자막과 병렬). 실패해도 파싱은 진행.
    const [segments, meta] = await Promise.all([
      fetchTranscript(videoId),
      fetchVideoMeta(videoId),
    ]);
    const transcript = transcriptToPrompt(segments);
    const recipe = await parseRecipeFromTranscript({
      transcript,
      videoTitle: body.videoTitle ?? meta.title,
      channelName: body.channelName ?? meta.channelName,
    });

    cache.set(videoId, { recipe, videoId });
    return NextResponse.json({ ok: true, recipe, videoId });
  } catch (err) {
    return errorResponse(err);
  }
}

/** 파싱 예외를 코드/상태로 매핑한다 (URL·텍스트 모드 공통). */
function errorResponse(err: unknown) {
  if (err instanceof NoTranscriptError) {
    return NextResponse.json(
      { ok: false, error: err.message, code: "no_transcript" },
      { status: 422 },
    );
  }
  if (err instanceof ParseFailedError) {
    return NextResponse.json(
      { ok: false, error: err.message, code: "parse_failed" },
      { status: 422 },
    );
  }
  if (err instanceof LlmConfigError) {
    console.error("[parse-recipe] LLM 설정 오류:", err.message);
    return NextResponse.json(
      { ok: false, error: err.message, code: "server_error" },
      { status: 500 },
    );
  }
  // 실제 원인을 서버 로그 + 응답에 남긴다 (인증 실패, 모델 접근 권한, 네트워크 등)
  console.error("[parse-recipe] 예외:", err);
  const detail = err instanceof Error ? err.message : String(err);
  return NextResponse.json(
    { ok: false, error: `서버 오류: ${detail}`, code: "server_error" },
    { status: 500 },
  );
}

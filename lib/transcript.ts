import { YoutubeTranscript } from "youtube-transcript";
import type { TranscriptSegment } from "./types";

export class NoTranscriptError extends Error {
  constructor(message = "이 영상은 자막이 없어 저장할 수 없습니다") {
    super(message);
    this.name = "NoTranscriptError";
  }
}

/**
 * 유튜브 자막을 추출한다. 한국어 우선, 실패 시 기본 자막으로 폴백.
 * youtube-transcript는 offset/duration을 밀리초로 반환하므로 초로 정규화한다.
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
  let raw;
  try {
    raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ko" });
  } catch {
    try {
      raw = await YoutubeTranscript.fetchTranscript(videoId);
    } catch {
      throw new NoTranscriptError();
    }
  }

  if (!raw || raw.length === 0) {
    throw new NoTranscriptError();
  }

  return raw.map((seg) => ({
    text: decodeEntities(seg.text).trim(),
    startSeconds: Math.round((seg.offset ?? 0) / 1000),
    durationSeconds: Math.round((seg.duration ?? 0) / 1000),
  }));
}

/** 자막을 Claude에 넘길 [mm:ss] text 형태의 단일 문자열로 만든다. */
export function transcriptToPrompt(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => `[${formatTimestamp(s.startSeconds)}] ${s.text}`)
    .join("\n");
}

export function formatTimestamp(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;#39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

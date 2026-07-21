import { YoutubeTranscript } from "youtube-transcript";
import type { TranscriptSegment } from "./types";

export class NoTranscriptError extends Error {
  constructor(message = "이 영상은 자막이 없어 저장할 수 없습니다") {
    super(message);
    this.name = "NoTranscriptError";
  }
}

/**
 * 유튜브 자막을 추출한다.
 *
 * 문제: `youtube-transcript`는 youtube.com을 직접 스크래핑하는데, YouTube가 데이터센터/클라우드
 * IP(Vercel 등)의 요청을 봇으로 보고 막는다 → 배포 환경에선 자막이 안 잡힘(로컬은 가정 IP라 됨).
 * 해결: 프록시를 내장한 서드파티 API(Supadata)를 경유하면 클라우드에서도 자막을 받아온다.
 *
 * 전략(크레딧 절약):
 *  - 로컬: 무료 직접 스크래핑을 먼저, 실패 시 Supadata 폴백.
 *  - 클라우드(Vercel): 직접 스크래핑은 어차피 막히므로 Supadata를 먼저, 스크래핑은 최후 폴백.
 * Supadata 키(SUPADATA_API_KEY)가 없으면 직접 스크래핑만 시도한다(로컬 개발 그대로).
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
  const apiKey = process.env.SUPADATA_API_KEY;
  const onCloud = !!process.env.VERCEL; // Vercel이 자동 주입 — 직접 스크래핑이 차단되는 환경

  const providers: Array<() => Promise<TranscriptSegment[]>> = [];
  if (apiKey && onCloud) {
    providers.push(() => fetchViaSupadata(videoId, apiKey));
    providers.push(() => fetchViaScrape(videoId));
  } else if (apiKey) {
    providers.push(() => fetchViaScrape(videoId));
    providers.push(() => fetchViaSupadata(videoId, apiKey));
  } else {
    providers.push(() => fetchViaScrape(videoId));
  }

  for (const provider of providers) {
    try {
      const segments = await provider();
      if (segments.length > 0) return segments;
    } catch (err) {
      // 이 공급원 실패 → 다음 폴백으로. 마지막까지 실패하면 아래에서 NoTranscriptError.
      console.warn("[transcript] 공급원 실패, 폴백 시도:", (err as Error).message);
    }
  }

  throw new NoTranscriptError();
}

/** 서드파티(Supadata) 경유 — 프록시 내장이라 클라우드에서도 동작. offset/duration은 ms. */
async function fetchViaSupadata(videoId: string, apiKey: string): Promise<TranscriptSegment[]> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  // mode=auto: 사람이 단 자막 우선, 없으면 자동 생성 자막까지 사용해 성공률을 높인다.
  const endpoint = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(videoUrl)}&mode=auto`;

  const res = await fetch(endpoint, { headers: { "x-api-key": apiKey } });

  // 긴 영상은 비동기 잡(202 + jobId)으로 처리될 수 있어 폴링한다.
  if (res.status === 202) {
    const { jobId } = (await res.json()) as { jobId?: string };
    if (!jobId) throw new Error("Supadata 202인데 jobId 없음");
    return await pollSupadataJob(jobId, apiKey);
  }
  if (!res.ok) throw new Error(`Supadata 오류 ${res.status}`);

  const data = (await res.json()) as SupadataResult;
  return mapSupadataContent(data.content);
}

type SupadataSegment = { text?: string; offset?: number; duration?: number };
type SupadataResult = { content?: SupadataSegment[] };
type SupadataJob = {
  status?: "queued" | "active" | "completed" | "failed";
  content?: SupadataSegment[];
  error?: string;
};

/** 비동기 잡 폴링 — 완료까지 짧게 재시도(서버 함수 제한시간 안에서). */
async function pollSupadataJob(jobId: string, apiKey: string): Promise<TranscriptSegment[]> {
  const endpoint = `https://api.supadata.ai/v1/transcript/${jobId}`;
  for (let i = 0; i < 12; i++) {
    await sleep(2000);
    const res = await fetch(endpoint, { headers: { "x-api-key": apiKey } });
    if (!res.ok) continue;
    const job = (await res.json()) as SupadataJob;
    if (job.status === "completed") return mapSupadataContent(job.content);
    if (job.status === "failed") throw new Error(`Supadata 잡 실패: ${job.error ?? "unknown"}`);
  }
  throw new Error("Supadata 잡 시간 초과");
}

function mapSupadataContent(content?: SupadataSegment[]): TranscriptSegment[] {
  if (!Array.isArray(content)) return [];
  return content
    .map((c) => ({
      text: decodeEntities(String(c.text ?? "")).trim(),
      startSeconds: Math.round((c.offset ?? 0) / 1000),
      durationSeconds: Math.round((c.duration ?? 0) / 1000),
    }))
    .filter((s) => s.text);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * youtube-transcript로 직접 스크래핑. 한국어 우선, 실패 시 기본 자막으로 폴백.
 * offset/duration을 밀리초로 반환하므로 초로 정규화한다. (로컬/가정 IP에선 무료로 동작)
 */
async function fetchViaScrape(videoId: string): Promise<TranscriptSegment[]> {
  let raw;
  try {
    raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ko" });
  } catch {
    raw = await YoutubeTranscript.fetchTranscript(videoId);
  }

  if (!raw || raw.length === 0) return [];

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

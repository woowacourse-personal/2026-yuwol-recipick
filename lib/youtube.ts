// YouTube 관련 유틸 (프레임워크 독립적)

/**
 * 다양한 형태의 유튜브 URL에서 videoId를 추출한다.
 * 지원: watch?v=, youtu.be/, shorts/, embed/
 * 유튜브가 아니면 null 반환.
 */
export function extractVideoId(input: string): string | null {
  const url = input.trim();
  if (!url) return null;

  // 이미 11자리 videoId 그대로 넘어온 경우
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return isValidId(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    // watch?v=ID
    const v = parsed.searchParams.get("v");
    if (v && isValidId(v)) return v;

    // /shorts/ID, /embed/ID, /live/ID
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["shorts", "embed", "live", "v"].includes(parts[0])) {
      return isValidId(parts[1]) ? parts[1] : null;
    }
  }

  return null;
}

function isValidId(id: string | undefined): id is string {
  return !!id && /^[a-zA-Z0-9_-]{11}$/.test(id);
}

export function isYouTubeUrl(input: string): boolean {
  return extractVideoId(input) !== null;
}

export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function watchUrl(videoId: string, startSeconds?: number): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`;
  return startSeconds ? `${base}&t=${Math.floor(startSeconds)}s` : base;
}

// 크리에이터 출처 표시 (PRD §8 화면3, §11-5, §16 저작권). 항상 접근 가능하게.
import type { Recipe } from "@/lib/types";
import { watchUrl } from "@/lib/youtube";
import { YouTubeGlyph } from "./YouTubeGlyph";

export function SourceAttribution({ recipe }: { recipe: Recipe }) {
  if (recipe.sourceType === "manual") {
    if (!recipe.sourceUrl) return null;
    return (
      <a
        href={recipe.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-neutral-500 underline"
      >
        원본 링크
      </a>
    );
  }

  const label = recipe.channelName
    ? `${recipe.channelName} 영상을 참고했어요`
    : "유튜브 영상을 참고했어요";

  return (
    <a
      href={recipe.videoId ? watchUrl(recipe.videoId) : recipe.sourceUrl ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-neutral-500"
    >
      <YouTubeGlyph className="h-4 w-5 shrink-0" />
      <span className="underline">{label}</span>
    </a>
  );
}

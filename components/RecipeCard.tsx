// 아카이브 목록의 레시피 카드 (PRD §8 화면1). 프레임워크 독립적 데이터, 표현만 여기서.
import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { YouTubeGlyph } from "./YouTubeGlyph";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="flex gap-3.5 rounded-2xl border border-neutral-100 bg-white p-2.5 shadow-sm transition active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {recipe.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.thumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : recipe.sourceType === "manual" ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-brand-400"
            >
              <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              <path d="M19 15v3.5A2.5 2.5 0 0116.5 21h-9A2.5 2.5 0 015 18.5v-9A2.5 2.5 0 017.5 7H11" />
            </svg>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-2xl">
            🍳
          </div>
        )}
        {recipe.sourceType === "youtube" && recipe.thumbnail && (
          <YouTubeGlyph className="absolute bottom-1 left-1 h-3.5 w-5 drop-shadow" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <h3 className="line-clamp-2 font-semibold leading-snug text-neutral-900">
          {recipe.title}
        </h3>
        {/* 채널·날짜를 한 줄로 응집 (조회수 제거 후 메타 정리) */}
        <p className="mt-1 truncate text-xs text-neutral-500">
          {recipe.channelName
            ? `${recipe.channelName} · ${formatDate(recipe.savedAt)}`
            : formatDate(recipe.savedAt)}
        </p>

        {/* 카테고리 칩을 하단에 고정해 카드 균형을 잡는다 */}
        {recipe.categories.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-2">
            {recipe.categories.slice(0, 3).map((c) => (
              <span
                key={c}
                className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
              >
                {c}
              </span>
            ))}
            {recipe.categories.length > 3 && (
              <span className="self-center text-[11px] font-medium text-neutral-400">
                +{recipe.categories.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

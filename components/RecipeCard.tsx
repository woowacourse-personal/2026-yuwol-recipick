// 아카이브 목록의 레시피 카드 (PRD §8 화면1). 프레임워크 독립적 데이터, 표현만 여기서.
import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-3 active:scale-[0.99]"
    >
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {recipe.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.thumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">
            {recipe.sourceType === "manual" ? "✍️" : "🍳"}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 font-semibold leading-snug">{recipe.title}</h3>
        {recipe.channelName && (
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {recipe.channelName}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 text-xs text-neutral-400">
          <span>{formatDate(recipe.savedAt)}</span>
          <span>·</span>
          <span>조회 {recipe.accessCount}</span>
          {recipe.sourceType === "manual" && (
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500">
              직접 작성
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

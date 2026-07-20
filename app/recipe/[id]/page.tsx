"use client";

// 재료 준비 화면 (PRD §8 화면3, Phase 5).
import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRecipe } from "@/lib/store";
import { recordView, getViewMode } from "@/lib/storage";
import { IngredientChecklist } from "@/components/IngredientChecklist";
import { StepOverview } from "@/components/StepOverview";
import { SourceAttribution } from "@/components/SourceAttribution";

export default function PrepPage() {
  const { id } = useParams<{ id: string }>();
  const recipe = useRecipe(id);

  // 조회 기록 (accessCount++, view 로그) — 마운트 시 1회
  const viewed = useRef(false);
  useEffect(() => {
    if (recipe && !viewed.current) {
      viewed.current = true;
      recordView(recipe.id);
    }
  }, [recipe]);

  if (!recipe) {
    return (
      <main className="mx-auto max-w-md p-6 text-center text-neutral-400">
        <p>레시피를 찾을 수 없어요.</p>
        <Link href="/" className="mt-2 inline-block underline">
          홈으로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28">
      <header className="flex items-start justify-between gap-3 py-4">
        <Link href="/" className="mt-1 text-neutral-400" aria-label="뒤로">
          ‹ 홈
        </Link>
        <Link
          href={`/recipe/${recipe.id}/edit`}
          className="mt-1 shrink-0 text-sm text-neutral-500 underline"
        >
          수정
        </Link>
      </header>

      <h1 className="text-2xl font-bold leading-tight">{recipe.title}</h1>
      <div className="mt-1">
        <SourceAttribution recipe={recipe} />
      </div>

      {recipe.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.tags.map((t) => (
            <span key={t} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* 재료 — 요리 순서와 대등하게 배치 */}
      <section className="mt-6">
        <h2 className="mb-1 text-lg font-bold">재료</h2>
        {recipe.ingredients.length > 0 ? (
          <IngredientChecklist ingredients={recipe.ingredients} />
        ) : (
          <p className="py-3 text-sm text-neutral-400">재료 정보가 없어요.</p>
        )}
      </section>

      {/* 요리 순서 미리보기 — 화면의 주인공 (파라디 지적) */}
      <section className="mt-8">
        <h2 className="mb-2 text-lg font-bold">요리 순서 · {recipe.steps.length}단계</h2>
        <StepOverview recipeId={recipe.id} steps={recipe.steps} />
      </section>

      {/* 요리 시작 (뷰 모드 선택 가능) */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-neutral-200 bg-white/95 p-3 backdrop-blur">
        <Link
          href={`/recipe/${recipe.id}/cook`}
          className="block rounded-2xl bg-neutral-900 py-4 text-center text-lg font-bold text-white"
        >
          요리 시작
          <span className="ml-2 text-sm font-normal text-neutral-300">
            {getViewMode() === "overview" ? "· 전체 모드" : "· 카드 모드"}
          </span>
        </Link>
        <div className="mt-2 flex justify-center gap-4 text-sm text-neutral-500">
          <Link href={`/recipe/${recipe.id}/cook?view=cards`} className="underline">
            카드 모드로 시작
          </Link>
          <Link href={`/recipe/${recipe.id}/cook?view=overview`} className="underline">
            전체 모드로 시작
          </Link>
        </div>
      </div>
    </main>
  );
}

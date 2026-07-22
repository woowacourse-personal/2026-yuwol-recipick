"use client";

// 재료 준비 화면 (PRD §8 화면3, Phase 5).
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRecipe, useCategories } from "@/lib/store";
import { recordView, updateRecipe, addCategory, removeCategory } from "@/lib/storage";
import { ServingsIngredients } from "@/components/ServingsIngredients";
import { StepOverview } from "@/components/StepOverview";
import { SourceAttribution } from "@/components/SourceAttribution";
import { CategoryPicker } from "@/components/CategoryPicker";

export default function PrepPage() {
  const { id } = useParams<{ id: string }>();
  const recipe = useRecipe(id);
  const allCategories = useCategories();

  // 저장 완료 피드백 (벤지: 저장됐는지 불확실) — ?saved=1로 넘어오면 잠깐 토스트.
  // useSearchParams의 Suspense 요구를 피하려 클라에서 location.search를 직접 읽는다.
  const [savedToast, setSavedToast] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("saved") !== "1") return;
    setSavedToast(true);
    const t = setTimeout(() => setSavedToast(false), 2600);
    return () => clearTimeout(t);
  }, []);

  // 조회 기록 (accessCount++, view 로그) — 마운트 시 1회
  const viewed = useRef(false);
  useEffect(() => {
    if (recipe && !viewed.current) {
      viewed.current = true;
      recordView(recipe.id);
    }
  }, [recipe]);

  // 채널명 백필: 예전에 저장돼 channelName이 비어있는 유튜브 레시피는 oEmbed로 채운다 (1회).
  const backfilled = useRef(false);
  useEffect(() => {
    if (!recipe || backfilled.current) return;
    if (recipe.sourceType !== "youtube" || !recipe.videoId || recipe.channelName) return;
    backfilled.current = true;
    fetch(`/api/video-meta?id=${recipe.videoId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.channelName) updateRecipe(recipe.id, { channelName: d.channelName });
      })
      .catch(() => {
        /* 백필 실패는 무시 */
      });
  }, [recipe]);

  function setCategories(next: string[]) {
    if (!recipe) return;
    next.forEach(addCategory);
    updateRecipe(recipe.id, { categories: next });
  }

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
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-40">
      {savedToast && (
        <div className="fixed inset-x-0 top-3 z-50 mx-auto flex max-w-md justify-center px-4">
          <div className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
            레시피를 담았어요 ✓
          </div>
        </div>
      )}
      <header className="flex items-start justify-between gap-3 py-4">
        <Link href="/" className="mt-1 text-neutral-400" aria-label="뒤로">
          ‹ 홈
        </Link>
        <Link
          href={`/recipe/${recipe.id}/edit`}
          className="mt-1 shrink-0 text-sm font-medium text-brand-600 underline"
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
            <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* 카테고리 분류 — 사용자 커스텀 카테고리로 이 레시피를 분류 */}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold">카테고리</h2>
        <CategoryPicker
          value={recipe.categories}
          existing={allCategories}
          onChange={setCategories}
          onRemoveExisting={removeCategory}
        />
      </section>

      {/* 재료 — 요리 순서와 대등하게 배치 */}
      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold">재료</h2>
        {recipe.ingredients.length > 0 ? (
          <ServingsIngredients
            ingredients={recipe.ingredients}
            baseServings={recipe.servings}
          />
        ) : (
          <p className="py-3 text-sm text-neutral-400">재료 정보가 없어요.</p>
        )}
      </section>

      {/* 요리 순서 미리보기 — 화면의 주인공 (파라디 지적) */}
      <section className="mt-8">
        <h2 className="mb-2 text-lg font-bold">요리 순서 · {recipe.steps.length}단계</h2>
        <StepOverview recipeId={recipe.id} steps={recipe.steps} />
      </section>

      {/* 요리 시작 — 두 뷰를 대등하게 노출 (어느 쪽도 기본 우위 두지 않음) */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
        <p className="mb-2.5 text-center text-sm font-medium text-neutral-500">🍳 어떻게 요리할까요?</p>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/recipe/${recipe.id}/cook?view=cards`}
            className="flex flex-col items-center gap-0.5 rounded-2xl bg-brand-500 py-3.5 text-white shadow-lg shadow-brand-500/30 transition active:scale-[0.99]"
          >
            <span className="text-lg font-bold">카드 모드</span>
            <span className="text-xs font-medium text-white/80">한 단계씩 크게</span>
          </Link>
          <Link
            href={`/recipe/${recipe.id}/cook?view=overview`}
            className="flex flex-col items-center gap-0.5 rounded-2xl bg-violet-500 py-3.5 text-white shadow-lg shadow-violet-500/30 transition active:scale-[0.99]"
          >
            <span className="text-lg font-bold">전체 모드</span>
            <span className="text-xs font-medium text-white/80">한눈에 훑기</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

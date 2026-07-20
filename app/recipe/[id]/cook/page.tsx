"use client";

// 쿠킹 모드 (PRD §8 화면4, Phase 3·4). 카드/전체 뷰 토글 + Wake Lock + 검증 로깅.
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRecipe } from "@/lib/store";
import { logEvent, getViewMode, setViewMode, type ViewMode } from "@/lib/storage";
import { useWakeLock } from "@/lib/useWakeLock";
import { CookingModeCards } from "@/components/CookingModeCards";
import { CookingModeOverview } from "@/components/CookingModeOverview";

export default function CookPage() {
  return (
    <Suspense fallback={<div className="p-6 text-neutral-400">불러오는 중…</div>}>
      <CookInner />
    </Suspense>
  );
}

function CookInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipe = useRecipe(id);

  useWakeLock(!!recipe);

  // 초기 뷰 모드: ?view 우선, 없으면 마지막 사용 모드 (PRD §8)
  const [view, setView] = useState<ViewMode>(() => {
    const q = searchParams.get("view");
    return q === "cards" || q === "overview" ? q : getViewMode();
  });

  // 초기 스텝: ?step (1-based) → 0-based
  const [index, setIndexState] = useState(0);
  const initialized = useRef(false);

  // 마운트 로깅 (startCooking + youtube면 openEmbed) + 초기 스텝 세팅
  useEffect(() => {
    if (!recipe || initialized.current) return;
    initialized.current = true;
    const stepParam = Number(searchParams.get("step"));
    if (stepParam >= 1 && stepParam <= recipe.steps.length) {
      setIndexState(stepParam - 1);
    }
    logEvent("startCooking", recipe.id, { view });
    if (recipe.sourceType === "youtube" && recipe.videoId) {
      logEvent("openEmbed", recipe.id);
    }
    setViewMode(view);
  }, [recipe, searchParams, view]);

  if (!recipe) {
    return (
      <main className="p-6 text-center text-neutral-400">
        <p>레시피를 찾을 수 없어요.</p>
        <Link href="/" className="mt-2 inline-block underline">홈으로</Link>
      </main>
    );
  }

  function setIndex(next: number) {
    const clamped = Math.max(0, Math.min(recipe!.steps.length - 1, next));
    setIndexState(clamped);
    logEvent("stepMove", recipe!.id, { to: clamped + 1, view });
  }

  function toggleView(next: ViewMode) {
    if (next === view) return;
    setView(next);
    setViewMode(next);
    logEvent("toggleView", recipe!.id, { to: next }); // 검증1 핵심 데이터
  }

  function onDetailFromOverview(i: number) {
    setIndexState(i);
    toggleView("cards");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-white">
      {/* 상단 바: 제목 + 뷰 토글(우측, 뚜렷하게) */}
      <header className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2">
        <button
          onClick={() => router.push(`/recipe/${recipe.id}`)}
          className="text-neutral-400"
          aria-label="닫기"
        >
          ✕
        </button>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{recipe.title}</h1>
        <div className="flex overflow-hidden rounded-full border border-neutral-300 text-xs">
          <button
            onClick={() => toggleView("cards")}
            className={`px-3 py-1.5 ${view === "cards" ? "bg-neutral-900 text-white" : "text-neutral-500"}`}
          >
            카드
          </button>
          <button
            onClick={() => toggleView("overview")}
            className={`px-3 py-1.5 ${view === "overview" ? "bg-neutral-900 text-white" : "text-neutral-500"}`}
          >
            전체
          </button>
        </div>
      </header>

      {view === "cards" ? (
        <CookingModeCards recipe={recipe} index={index} setIndex={setIndex} />
      ) : (
        <CookingModeOverview recipe={recipe} onDetail={onDetailFromOverview} />
      )}
    </main>
  );
}

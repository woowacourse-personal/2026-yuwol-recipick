"use client";

// 쿠킹 모드 (PRD §8 화면4, Phase 3·4). 카드/전체 뷰 토글 + Wake Lock + 검증 로깅.
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRecipe } from "@/lib/store";
import { logEvent, getViewMode, setViewMode, updateRecipe, type ViewMode } from "@/lib/storage";
import { useWakeLock } from "@/lib/useWakeLock";
import { CookingModeCards } from "@/components/CookingModeCards";
import { CookingModeOverview } from "@/components/CookingModeOverview";
import { YouTubeEmbed, type YouTubeEmbedHandle } from "@/components/YouTubeEmbed";
import type { Recipe } from "@/lib/types";

/**
 * 해당 스텝의 영상 위치(초). 스텝 자체에 타임스탬프가 없으면 바로 앞의 타임스탬프로,
 * 그것도 없으면 뒤에서 채운다 → 자막 품질로 일부 스텝만 타임스탬프가 붙어도 연동이 끊기지 않게 한다.
 * 영상에 타임스탬프가 하나도 없으면 undefined(연동 불가).
 */
function effectiveStartTime(steps: Recipe["steps"], index: number): number | undefined {
  for (let i = index; i >= 0; i--) {
    if (steps[i]?.startTime !== undefined) return steps[i].startTime;
  }
  for (let i = index + 1; i < steps.length; i++) {
    if (steps[i]?.startTime !== undefined) return steps[i].startTime;
  }
  return undefined;
}

/** 현재 재생 시각(초)에 해당하는 스텝 인덱스 (전체 뷰 자동 하이라이트용). 없으면 -1. */
function stepIndexAtTime(steps: Recipe["steps"], seconds: number): number {
  let active = -1;
  for (let i = 0; i < steps.length; i++) {
    const t = steps[i].startTime;
    if (t !== undefined && seconds >= t) active = i;
  }
  return active;
}

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

  // 공유 영상 플레이어 — cook 페이지가 소유해 카드/전체 뷰 전환에도 재생이 끊기지 않는다(왓슨).
  const embedRef = useRef<YouTubeEmbedHandle>(null);
  const [activeIndex, setActiveIndex] = useState(-1); // 전체 뷰 자동 하이라이트 (재생 시각 기반)
  const [embedBlocked, setEmbedBlocked] = useState(false); // 임베드 제한 영상 → 영상 영역 자체를 숨김
  const isYoutube =
    !!recipe && recipe.sourceType === "youtube" && !!recipe.videoId && !embedBlocked;

  // 카드 스텝 이동 시: 해당 구간으로 이동하되 재생하지 않고 정지 — 다음 단계 준비 시간 확보(송송).
  // 전체 뷰에선 영상을 자유 재생(자동 하이라이트)하므로 이 강제 이동을 걸지 않는다.
  useEffect(() => {
    if (!recipe || !isYoutube || view !== "cards") return;
    const t = effectiveStartTime(recipe.steps, index);
    if (t !== undefined) embedRef.current?.seekTo(t, false); // seek + pause
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, view, isYoutube]);

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

  // 요리 중 오타 즉시 수정 — 해당 스텝 텍스트만 갱신해 localStorage에 저장.
  function editStepText(i: number, text: string) {
    if (!recipe) return;
    const steps = recipe.steps.map((s, idx) => (idx === i ? { ...s, text } : s));
    updateRecipe(recipe.id, { steps });
  }

  function onDetailFromOverview(i: number) {
    setIndexState(i);
    toggleView("cards");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#221d1a] text-neutral-100">
      {/* 상단 바: 제목 + 뷰 토글(우측, 뚜렷하게) */}
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <button
          onClick={() => router.push(`/recipe/${recipe.id}`)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/60 active:bg-white/10"
          aria-label="닫기"
        >
          ✕
        </button>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{recipe.title}</h1>
        {/* 카드/전체는 대등한 두 뷰 — 우열 대신 서로 다른 색(코랄/바이올렛)으로 구분만 한다 (CLAUDE.md) */}
        <div className="flex overflow-hidden rounded-full border border-white/20 text-[11px]">
          <button
            onClick={() => toggleView("cards")}
            className={`px-2.5 py-1.5 font-medium ${view === "cards" ? "bg-brand-500 text-white" : "text-white/60"}`}
          >
            카드
          </button>
          <button
            onClick={() => toggleView("overview")}
            className={`px-2.5 py-1.5 font-medium ${view === "overview" ? "bg-violet-500 text-white" : "text-white/60"}`}
          >
            전체
          </button>
        </div>
      </header>

      {/* 공유 영상 — 뷰 전환에도 파괴되지 않아 재생이 유지된다 */}
      {isYoutube && (
        <div className="w-full bg-black">
          <YouTubeEmbed
            ref={embedRef}
            videoId={recipe.videoId!}
            startSeconds={effectiveStartTime(recipe.steps, index) ?? 0}
            onTime={(t) => {
              const i = stepIndexAtTime(recipe.steps, t);
              setActiveIndex((prev) => (prev === i ? prev : i));
            }}
            onBlocked={() => setEmbedBlocked(true)}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-y-auto">
        {view === "cards" ? (
          <CookingModeCards
            recipe={recipe}
            index={index}
            setIndex={setIndex}
            onEditStep={editStepText}
          />
        ) : (
          <CookingModeOverview
            recipe={recipe}
            onDetail={onDetailFromOverview}
            activeIndex={activeIndex}
          />
        )}
      </div>
    </main>
  );
}

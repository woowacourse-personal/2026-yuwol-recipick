"use client";

// 쿠킹 모드 · 전체 뷰 (PRD §8 화면4, 파라디 제안). 스크롤 나열 + 상단 고정 임베드 + 재생 중 자동 하이라이트.
import { useState } from "react";
import type { Recipe } from "@/lib/types";
import { HighlightedText } from "./HighlightedText";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { formatTime } from "@/lib/format";

/** 현재 재생 시각(초)에 해당하는 스텝 인덱스를 구한다. */
function stepIndexAtTime(recipe: Recipe, seconds: number): number {
  const steps = recipe.steps;
  let active = -1;
  for (let i = 0; i < steps.length; i++) {
    const t = steps[i].startTime;
    if (t !== undefined && seconds >= t) active = i;
  }
  return active;
}

export function CookingModeOverview({
  recipe,
  onDetail,
  onOpenEmbed,
}: {
  recipe: Recipe;
  onDetail: (index: number) => void;
  onOpenEmbed?: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const isYoutube = recipe.sourceType === "youtube" && !!recipe.videoId;

  return (
    <div className="flex flex-1 flex-col">
      {isYoutube && (
        <div className="sticky top-0 z-10 w-full bg-black" onClick={onOpenEmbed}>
          <YouTubeEmbed
            videoId={recipe.videoId!}
            startSeconds={recipe.steps[0]?.startTime ?? 0}
            onTime={(t) => {
              const i = stepIndexAtTime(recipe, t);
              setActiveIndex((prev) => (prev === i ? prev : i));
            }}
          />
        </div>
      )}

      <ol className="flex-1 space-y-3 p-4">
        {recipe.steps.map((s, i) => {
          const active = i === activeIndex;
          return (
            <li key={s.order}>
              <button
                onClick={() => onDetail(i)}
                aria-label={`${s.order}단계 카드로 보기`}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  active ? "border-brand-500 bg-brand-500/10" : "border-white/10 bg-white/5 active:bg-white/10"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    active ? "bg-brand-500 text-white" : "bg-white/10 text-white/70"
                  }`}
                >
                  {s.order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg leading-relaxed text-neutral-50">
                    <HighlightedText text={s.text} highlights={s.highlights} />
                  </p>
                  {s.memo && (
                    <p className="mt-2 rounded-lg bg-amber-400/15 p-2 text-sm text-amber-200">
                      📝 {s.memo}
                    </p>
                  )}
                  {s.startTime !== undefined && (
                    <span className="mt-2 inline-block text-xs text-white/40">
                      {formatTime(s.startTime)}
                    </span>
                  )}
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`mt-0.5 h-5 w-5 shrink-0 ${active ? "text-brand-400" : "text-white/30"}`}
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

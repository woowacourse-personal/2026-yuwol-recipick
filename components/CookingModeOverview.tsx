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
            <li
              key={s.order}
              className={`rounded-2xl border p-4 transition-colors ${
                active ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    active ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {s.order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg leading-relaxed">
                    <HighlightedText text={s.text} highlights={s.highlights} />
                  </p>
                  {s.memo && (
                    <p className="mt-2 rounded-lg bg-yellow-50 p-2 text-sm text-yellow-900">
                      📝 {s.memo}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    {s.startTime !== undefined && (
                      <span className="text-xs text-neutral-400">{formatTime(s.startTime)}</span>
                    )}
                    <button
                      onClick={() => onDetail(i)}
                      className="text-sm font-medium text-neutral-600 underline"
                    >
                      상세 보기
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

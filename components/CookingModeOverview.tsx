"use client";

// 쿠킹 모드 · 전체 뷰 (PRD §8 화면4, 파라디 제안). 스크롤 나열 + 재생 중 자동 하이라이트.
// 영상 임베드는 부모(cook 페이지)가 소유(뷰 전환에도 재생 유지). activeIndex도 부모가 재생 시각으로 계산해 내려준다.
import type { Recipe } from "@/lib/types";
import { HighlightedText } from "./HighlightedText";
import { formatTime } from "@/lib/format";

export function CookingModeOverview({
  recipe,
  onDetail,
  activeIndex,
}: {
  recipe: Recipe;
  onDetail: (index: number) => void;
  activeIndex: number; // 현재 재생 구간에 해당하는 스텝 (없으면 -1)
}) {
  return (
    <div className="flex flex-1 flex-col">
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

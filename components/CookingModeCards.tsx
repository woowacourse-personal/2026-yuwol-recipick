"use client";

// 쿠킹 모드 · 카드 뷰 (PRD §8 화면4). 스텝별 카드 + 스와이프 + 하이라이팅.
// 영상 임베드는 부모(cook 페이지)가 소유해 카드/전체 뷰 전환에도 재생이 끊기지 않는다(왓슨 지적).
import { useRef, useState } from "react";
import type { Recipe } from "@/lib/types";
import { HighlightedText } from "./HighlightedText";
import { StepTimer } from "./StepTimer";
import { formatTime } from "@/lib/format";
import { stepTimerSeconds } from "@/lib/timers";

export function CookingModeCards({
  recipe,
  index,
  setIndex,
}: {
  recipe: Recipe;
  index: number;
  setIndex: (i: number) => void;
}) {
  const steps = recipe.steps;
  const step = steps[index];
  const [listOpen, setListOpen] = useState(false);

  // 스와이프
  const startX = useRef<number | null>(null);
  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (dx < -50 && index < steps.length - 1) setIndex(index + 1);
    else if (dx > 50 && index > 0) setIndex(index - 1);
  }

  if (!step) return null;

  const timerSeconds = stepTimerSeconds(step);
  const nextStep = steps[index + 1]; // 다음 스텝 한 줄 미리보기용 (왓슨: "다음 스텝 축약을 같이")

  return (
    <div className="flex flex-1 flex-col">
      <div
        className="flex flex-1 select-none flex-col p-5"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="mb-4 flex items-center justify-center gap-2 text-sm text-white/40">
          <span className="font-bold text-brand-400">
            {index + 1} / {steps.length}
          </span>
          {step.startTime !== undefined && <span>· {formatTime(step.startTime)}</span>}
        </div>

        <p className="text-center text-3xl leading-relaxed text-neutral-50">
          <HighlightedText text={step.text} highlights={step.highlights} />
        </p>

        {step.memo && (
          <p className="mt-4 rounded-xl bg-amber-400/15 p-3 text-center text-base text-amber-200">
            📝 {step.memo}
          </p>
        )}

        {timerSeconds !== null && (
          <div className="mt-5">
            <StepTimer
              timerKey={`${recipe.id}:${step.order}`}
              defaultSeconds={timerSeconds}
            />
          </div>
        )}

        <div className="mt-auto pt-6">
          {/* 다음 스텝 미리보기 — 목록(거부됨)이 아니라 "다음 하나"의 지시문 전문.
              현재 스텝(text-3xl)을 방해하지 않게 작은 글씨·낮은 대비로 상시 노출. */}
          {nextStep && (
            <div className="mb-3 flex items-baseline gap-2 border-t border-white/10 pt-3">
              <span className="shrink-0 text-sm font-bold text-brand-400/80">다음</span>
              <p className="text-sm leading-relaxed text-white/45">{nextStep.text}</p>
            </div>
          )}

          {/* 프로그레스 바 */}
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => index > 0 && setIndex(index - 1)}
              disabled={index === 0}
              className="flex-1 rounded-xl border border-white/20 py-4 text-lg font-medium text-white active:bg-white/10 disabled:opacity-25"
            >
              이전
            </button>
            <button
              onClick={() => setListOpen(true)}
              className="rounded-xl border border-white/20 px-4 py-4 text-lg text-white active:bg-white/10"
              aria-label="전체 보기"
            >
              목록
            </button>
            <button
              onClick={() => index < steps.length - 1 && setIndex(index + 1)}
              disabled={index === steps.length - 1}
              className="flex-1 rounded-xl bg-brand-500 py-4 text-lg font-bold text-white shadow-lg shadow-brand-500/30 active:scale-[0.99] disabled:opacity-25 disabled:shadow-none"
            >
              다음
            </button>
          </div>
        </div>
      </div>

      {listOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setListOpen(false)}
        >
          <div
            className="mx-auto max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#2a2320] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 font-bold text-white">전체 스텝</h3>
            <ol className="space-y-1">
              {steps.map((s, i) => (
                <li key={s.order}>
                  <button
                    onClick={() => {
                      setIndex(i);
                      setListOpen(false);
                    }}
                    className={`flex w-full gap-2 rounded-lg p-3 text-left ${
                      i === index ? "bg-brand-500 text-white" : "text-neutral-200 active:bg-white/10"
                    }`}
                  >
                    <span className="font-bold">{s.order}.</span>
                    <span className="flex-1">{s.summary || s.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

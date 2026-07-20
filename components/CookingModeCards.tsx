"use client";

// 쿠킹 모드 · 카드 뷰 (PRD §8 화면4). 스텝별 카드 + 임베드 + 스와이프 + 하이라이팅.
import { useEffect, useRef, useState } from "react";
import type { Recipe } from "@/lib/types";
import { HighlightedText } from "./HighlightedText";
import { YouTubeEmbed, type YouTubeEmbedHandle } from "./YouTubeEmbed";
import { formatTime } from "@/lib/format";

export function CookingModeCards({
  recipe,
  index,
  setIndex,
  onOpenEmbed,
}: {
  recipe: Recipe;
  index: number;
  setIndex: (i: number) => void;
  onOpenEmbed?: () => void;
}) {
  const steps = recipe.steps;
  const step = steps[index];
  const embedRef = useRef<YouTubeEmbedHandle>(null);
  const [listOpen, setListOpen] = useState(false);
  const isYoutube = recipe.sourceType === "youtube" && !!recipe.videoId;

  // 스텝 이동 시 타임스탬프로 seek
  useEffect(() => {
    if (isYoutube && step?.startTime !== undefined) {
      embedRef.current?.seekTo(step.startTime);
    }
  }, [index, isYoutube, step?.startTime]);

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

  return (
    <div className="flex flex-1 flex-col">
      {isYoutube && (
        <div className="w-full" onClick={onOpenEmbed}>
          <YouTubeEmbed
            ref={embedRef}
            videoId={recipe.videoId!}
            startSeconds={steps[index]?.startTime ?? 0}
          />
        </div>
      )}

      <div
        className="flex flex-1 select-none flex-col p-5"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="mb-3 flex items-center gap-2 text-sm text-neutral-400">
          <span className="font-bold text-neutral-900">
            {index + 1} / {steps.length}
          </span>
          {step.startTime !== undefined && <span>· {formatTime(step.startTime)}</span>}
        </div>

        <p className="text-2xl leading-relaxed">
          <HighlightedText text={step.text} highlights={step.highlights} />
        </p>

        {step.memo && (
          <p className="mt-4 rounded-xl bg-yellow-50 p-3 text-base text-yellow-900">
            📝 {step.memo}
          </p>
        )}

        <div className="mt-auto pt-6">
          {/* 프로그레스 바 */}
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full bg-neutral-900 transition-all"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => index > 0 && setIndex(index - 1)}
              disabled={index === 0}
              className="flex-1 rounded-xl border border-neutral-300 py-4 text-lg font-medium disabled:opacity-30"
            >
              이전
            </button>
            <button
              onClick={() => setListOpen(true)}
              className="rounded-xl border border-neutral-300 px-4 py-4 text-lg"
              aria-label="전체 보기"
            >
              목록
            </button>
            <button
              onClick={() => index < steps.length - 1 && setIndex(index + 1)}
              disabled={index === steps.length - 1}
              className="flex-1 rounded-xl bg-neutral-900 py-4 text-lg font-medium text-white disabled:opacity-30"
            >
              다음
            </button>
          </div>
        </div>
      </div>

      {listOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => setListOpen(false)}
        >
          <div
            className="max-h-[70vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 font-bold">전체 스텝</h3>
            <ol className="space-y-1">
              {steps.map((s, i) => (
                <li key={s.order}>
                  <button
                    onClick={() => {
                      setIndex(i);
                      setListOpen(false);
                    }}
                    className={`flex w-full gap-2 rounded-lg p-2 text-left ${
                      i === index ? "bg-neutral-900 text-white" : "active:bg-neutral-100"
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

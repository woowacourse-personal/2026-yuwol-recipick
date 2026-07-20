"use client";

// 파싱 대기 표시 — 스피너 + 단계별 가이드 텍스트.
// LLM 파싱은 수 초~십수 초 걸리므로 "지금 뭘 하는 중인지"를 순차 문구로 안내한다.
import { useEffect, useState } from "react";

/** 회전 스피너 (외부 의존 없이 인라인 SVG). 버튼 내부에도 재사용. */
export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

/**
 * 스피너 + 순차 가이드 문구. messages를 stepMs 간격으로 넘기며
 * 마지막 문구에서 멈춘다(끝났는지 모를 때 계속 마지막 안내를 유지).
 */
export function ParsingIndicator({
  messages,
  stepMs = 2500,
  className = "",
}: {
  messages: string[];
  stepMs?: number;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setIdx((i) => (i < messages.length - 1 ? i + 1 : i));
    }, stepMs);
    return () => clearInterval(timer);
  }, [messages, stepMs]);

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-3 text-neutral-600 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-5 w-5 shrink-0 text-neutral-500" />
      <span className="text-sm">{messages[idx]}</span>
    </div>
  );
}

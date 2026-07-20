"use client";

// 스텝 타이머 (쿠킹 모드). 레시피에 적힌 시간으로 기본 세팅되고, 사용자가 ±로 조정 가능.
// 상태는 lib/timers 세션 매니저에 있어 스텝을 넘나들어도 유지되고, 시간이 되면 소리·진동으로 알린다.
import { useEffect, useSyncExternalStore } from "react";
import {
  subscribeTimers,
  getTimer,
  initTimer,
  startTimer,
  pauseTimer,
  resetTimer,
  adjustTimer,
  formatTimer,
  type TimerState,
} from "@/lib/timers";

export function StepTimer({
  timerKey,
  defaultSeconds,
}: {
  timerKey: string;
  defaultSeconds: number;
}) {
  // 스텝 진입 시 기본 시간으로 초기화(이미 있으면 진행 상태 보존).
  useEffect(() => {
    initTimer(timerKey, defaultSeconds);
  }, [timerKey, defaultSeconds]);

  const timer = useSyncExternalStore(
    subscribeTimers,
    () => getTimer(timerKey),
    () => undefined,
  );

  const view: TimerState = timer ?? {
    duration: defaultSeconds,
    remaining: defaultSeconds,
    status: "idle",
  };

  const running = view.status === "running";
  const finished = view.status === "finished";
  const canAdjust = !running;

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        finished
          ? "animate-pulse border-brand-400 bg-brand-500/25"
          : "border-white/15 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-white/60">
          ⏱ 타이머
        </span>
        {finished && <span className="text-sm font-bold text-brand-300">시간 완료!</span>}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        <button
          onClick={() => adjustTimer(timerKey, -60)}
          disabled={!canAdjust || view.duration < 60}
          className="h-10 w-12 rounded-lg border border-white/15 text-sm text-white/70 active:bg-white/10 disabled:opacity-25"
          aria-label="1분 줄이기"
        >
          −1분
        </button>
        <button
          onClick={() => adjustTimer(timerKey, -10)}
          disabled={!canAdjust || view.duration < 10}
          className="h-10 w-12 rounded-lg border border-white/15 text-sm text-white/70 active:bg-white/10 disabled:opacity-25"
          aria-label="10초 줄이기"
        >
          −10초
        </button>
        <span
          className={`min-w-[5.5rem] text-center font-mono text-4xl font-bold tabular-nums ${
            finished ? "text-brand-200" : "text-white"
          }`}
        >
          {formatTimer(view.remaining)}
        </span>
        <button
          onClick={() => adjustTimer(timerKey, 10)}
          disabled={!canAdjust}
          className="h-10 w-12 rounded-lg border border-white/15 text-sm text-white/70 active:bg-white/10 disabled:opacity-25"
          aria-label="10초 늘리기"
        >
          +10초
        </button>
        <button
          onClick={() => adjustTimer(timerKey, 60)}
          disabled={!canAdjust}
          className="h-10 w-12 rounded-lg border border-white/15 text-sm text-white/70 active:bg-white/10 disabled:opacity-25"
          aria-label="1분 늘리기"
        >
          +1분
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        {finished ? (
          <button
            onClick={() => resetTimer(timerKey)}
            className="flex-1 rounded-xl bg-brand-500 py-3 font-bold text-white active:scale-[0.99]"
          >
            다시 맞추기
          </button>
        ) : (
          <>
            <button
              onClick={() => (running ? pauseTimer(timerKey) : startTimer(timerKey))}
              disabled={view.remaining <= 0}
              className="flex-1 rounded-xl bg-brand-500 py-3 font-bold text-white active:scale-[0.99] disabled:opacity-30"
            >
              {running ? "일시정지" : view.status === "paused" ? "계속" : "시작"}
            </button>
            <button
              onClick={() => resetTimer(timerKey)}
              disabled={view.status === "idle"}
              className="rounded-xl border border-white/20 px-5 py-3 font-medium text-white active:bg-white/10 disabled:opacity-25"
            >
              초기화
            </button>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

// 쿠킹 타이머 — 시간 파싱 + 세션 타이머 매니저.
// 스텝의 시간 정보(예: "5분")를 초로 환산해 기본값으로 쓰고, 사용자가 조정할 수 있다.
// 타이머 상태는 세션 메모리에만 두어(=localStorage 저장 안 함) 스텝을 넘나들어도 유지되고,
// 단일 인터벌이 시간이 된 타이머를 감지해 소리·진동으로 한 번 알린다. storage.ts와 동일한 구독 패턴.

import type { Step } from "./types";

// ---- 시간 표현 파싱 ----
/** "5분", "1분 30초", "1시간 30분", "30초", "약 10분" 등 한국어 시간 표현을 초로 변환. 없으면 null. */
export function parseDurationToSeconds(text: string): number | null {
  if (!text) return null;
  let total = 0;
  let matched = false;
  const h = text.match(/(\d+)\s*시간/);
  if (h) {
    total += parseInt(h[1], 10) * 3600;
    matched = true;
  }
  // "2분의 1"(=절반) 같은 분수 표현은 시간이 아니므로 제외.
  const m = text.match(/(\d+)\s*분(?!의)/);
  if (m) {
    total += parseInt(m[1], 10) * 60;
    matched = true;
  }
  const s = text.match(/(\d+)\s*초/);
  if (s) {
    total += parseInt(s[1], 10);
    matched = true;
  }
  if (!matched || total <= 0) return null;
  return total;
}

/** 스텝에서 타이머 기본 시간(초)을 추론한다. time 하이라이트를 우선, 없으면 지시문에서 탐색. */
export function stepTimerSeconds(step: Step): number | null {
  for (const h of step.highlights) {
    if (h.type === "time") {
      const sec = parseDurationToSeconds(h.value);
      if (sec !== null) return sec;
    }
  }
  return parseDurationToSeconds(step.text);
}

// ---- 세션 타이머 매니저 ----
export type TimerStatus = "idle" | "running" | "paused" | "finished";
export type TimerState = {
  duration: number; // 설정된 총 시간(초) — 사용자가 조정 가능
  remaining: number; // 남은 시간(초)
  status: TimerStatus;
};

const timers = new Map<string, TimerState>();
const endAt = new Map<string, number>(); // running일 때 종료 예정 timestamp(ms)
const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;

export function subscribeTimers(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((fn) => fn());
}

export function getTimer(key: string): TimerState | undefined {
  return timers.get(key);
}

function set(key: string, next: TimerState) {
  timers.set(key, next); // 새 객체로 교체 → useSyncExternalStore 참조 변경 감지
}

function ensureInterval() {
  if (interval) return;
  interval = setInterval(tick, 250);
}
function maybeStopInterval() {
  const running = [...timers.values()].some((t) => t.status === "running");
  if (!running && interval) {
    clearInterval(interval);
    interval = null;
  }
}

function tick() {
  const now = Date.now();
  let changed = false;
  for (const [key, t] of timers) {
    if (t.status !== "running") continue;
    const end = endAt.get(key) ?? now;
    const rem = Math.max(0, Math.round((end - now) / 1000));
    if (rem <= 0) {
      set(key, { ...t, remaining: 0, status: "finished" });
      endAt.delete(key);
      alarm();
      changed = true;
    } else if (rem !== t.remaining) {
      set(key, { ...t, remaining: rem });
      changed = true;
    }
  }
  if (changed) emit();
  maybeStopInterval();
}

/** 스텝 진입 시 호출 — 이미 있으면 그대로 두어 진행 중 타이머를 보존한다. */
export function initTimer(key: string, duration: number) {
  if (timers.has(key)) return;
  set(key, { duration, remaining: duration, status: "idle" });
  emit();
}

export function startTimer(key: string) {
  const t = timers.get(key);
  if (!t || t.status === "running" || t.remaining <= 0) return;
  ensureAudio(); // 사용자 제스처(시작 버튼) 시점에 오디오 활성화
  endAt.set(key, Date.now() + t.remaining * 1000);
  set(key, { ...t, status: "running" });
  ensureInterval();
  emit();
}

export function pauseTimer(key: string) {
  const t = timers.get(key);
  if (!t || t.status !== "running") return;
  const end = endAt.get(key) ?? Date.now();
  const rem = Math.max(0, Math.round((end - Date.now()) / 1000));
  endAt.delete(key);
  set(key, { ...t, remaining: rem, status: "paused" });
  emit();
  maybeStopInterval();
}

export function resetTimer(key: string) {
  const t = timers.get(key);
  if (!t) return;
  endAt.delete(key);
  set(key, { ...t, remaining: t.duration, status: "idle" });
  emit();
  maybeStopInterval();
}

/** 시간 조정(초 단위 증감). 진행 중에는 무시. 완료 상태면 idle로 되돌린다. */
export function adjustTimer(key: string, delta: number) {
  const t = timers.get(key);
  if (!t || t.status === "running") return;
  const nextDuration = Math.max(0, t.duration + delta);
  set(key, { duration: nextDuration, remaining: nextDuration, status: "idle" });
  emit();
}

// ---- 알림 (소리 + 진동) ----
let audioCtx: AudioContext | null = null;
function ensureAudio() {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      try {
        audioCtx = new Ctx();
      } catch {
        /* 미지원 브라우저 무시 */
      }
    }
  }
  if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
}

function alarm() {
  // 진동 (지원 기기)
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([300, 150, 300, 150, 300]);
  }
  // 삐 3회
  if (!audioCtx) return;
  const start = audioCtx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    const t = start + i * 0.5;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.4);
  }
}

/** 타이머 시간 표시(초 → H:MM:SS 또는 M:SS). */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

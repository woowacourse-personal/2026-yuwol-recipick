"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { watchUrl } from "@/lib/youtube";

// YT IFrame API 최소 타입
type YTPlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};
declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type YouTubeEmbedHandle = {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
};

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

type Props = {
  videoId: string;
  startSeconds?: number;
  /** 재생 중 현재 시각(초)을 주기적으로 전달 — 전체 뷰 자동 하이라이트용 */
  onTime?: (seconds: number) => void;
  /** 임베드 차단 등으로 재생 불가 시 */
  onBlocked?: () => void;
  className?: string;
};

/**
 * YouTube IFrame Player 래퍼 (PRD §3, 화면4).
 * - 특정 타임스탬프 시작 + 외부에서 seekTo 제어
 * - 재생 중 onTime 콜백 (전체 뷰 자동 하이라이트)
 * - 임베드 차단 영상은 "유튜브에서 보기" 폴백 (PRD §12)
 */
export const YouTubeEmbed = forwardRef<YouTubeEmbedHandle, Props>(
  function YouTubeEmbed({ videoId, startSeconds = 0, onTime, onBlocked, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const [blocked, setBlocked] = useState(false);
    const onTimeRef = useRef(onTime);
    onTimeRef.current = onTime;

    useImperativeHandle(ref, () => ({
      seekTo: (s: number) => playerRef.current?.seekTo?.(s, true),
      getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
    }));

    useEffect(() => {
      let cancelled = false;
      let interval: ReturnType<typeof setInterval> | undefined;

      loadYouTubeApi().then(() => {
        if (cancelled || !containerRef.current || !window.YT) return;
        // YT.Player는 전달된 엘리먼트를 <iframe>으로 "교체"한다.
        // React가 관리하는 노드를 직접 넘기면 이후 React가 그 노드를 제거하려다
        // removeChild 크래시("not a child")가 난다. → React가 모르는 자식 노드를 만들어 넘긴다.
        const host = document.createElement("div");
        host.className = "h-full w-full";
        containerRef.current.appendChild(host);
        playerRef.current = new window.YT.Player(host, {
          videoId,
          playerVars: {
            start: Math.floor(startSeconds),
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            // 플레이어 메서드(getCurrentTime 등)는 onReady 이후에만 붙는다.
            // 생성 직후 폴링을 걸면 "getCurrentTime is not a function"으로 크래시.
            onReady: () => {
              if (cancelled) return;
              interval = setInterval(() => {
                const t = playerRef.current?.getCurrentTime?.();
                if (typeof t === "number") onTimeRef.current?.(t);
              }, 700);
            },
            onError: () => {
              setBlocked(true);
              onBlocked?.();
            },
          },
        });
      });

      return () => {
        cancelled = true;
        if (interval) clearInterval(interval);
        try {
          playerRef.current?.destroy();
        } catch {
          /* noop */
        }
        playerRef.current = null;
        // YT가 만든 iframe 등 잔여 노드를 정리 (containerRef는 React 리프라 안전).
        if (containerRef.current) containerRef.current.innerHTML = "";
      };
      // videoId가 바뀌면 재생성. startSeconds 변경은 seekTo로 처리(부모 책임).
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId]);

    if (blocked) {
      return (
        <div
          className={`flex aspect-video w-full flex-col items-center justify-center gap-2 bg-neutral-900 text-neutral-200 ${className ?? ""}`}
        >
          <p className="text-sm">이 영상은 임베드가 제한되어 있어요</p>
          <a
            href={watchUrl(videoId, startSeconds)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white"
          >
            유튜브에서 보기
          </a>
        </div>
      );
    }

    return (
      <div className={`aspect-video w-full bg-black ${className ?? ""}`}>
        <div ref={containerRef} className="h-full w-full" />
      </div>
    );
  },
);

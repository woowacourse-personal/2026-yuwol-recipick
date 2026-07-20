"use client";

// 설정 (Phase 8). 사용 로그 내보내기(카톡/이메일 전달용) + 저작권 문구 (PRD §13·§16).
import { useState } from "react";
import Link from "next/link";
import { exportData, getLogs } from "@/lib/storage";

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);

  async function copyLogs() {
    const json = exportData();
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 실패 시 파일 다운로드로 폴백
      download(json);
    }
  }

  function download(json?: string) {
    const data = json ?? exportData();
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `recipick-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const logCount = getLogs().length;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-12">
      <header className="flex items-center gap-2 py-4">
        <Link href="/" className="text-neutral-400">‹ 홈</Link>
        <h1 className="font-semibold">설정</h1>
      </header>

      <section className="rounded-2xl border border-neutral-200 p-4">
        <h2 className="font-bold">사용 로그 내보내기</h2>
        <p className="mt-1 text-sm text-neutral-500">
          실사용 검증을 위한 데이터예요. 현재 {logCount}개의 이벤트가 기록되어 있습니다.
          아래 버튼으로 복사하거나 파일로 받아 개발자에게 전달해주세요.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={copyLogs}
            className="flex-1 rounded-xl bg-neutral-900 py-3 font-medium text-white"
          >
            {copied ? "복사됨 ✓" : "로그 복사"}
          </button>
          <button
            onClick={() => download()}
            className="rounded-xl border border-neutral-300 px-4 py-3 font-medium"
          >
            파일로 저장
          </button>
        </div>
      </section>

      <section className="mt-6 text-xs leading-relaxed text-neutral-400">
        <p className="font-medium text-neutral-500">저작권 안내</p>
        <p className="mt-1">
          레시픽은 원 크리에이터의 유튜브 영상을 참고 자료로 연결합니다. 모든 레시피에는
          출처(채널명·원본 링크)가 표기되며, 영상 자체의 저작권은 각 크리에이터에게 있습니다.
          이 앱은 개인적인 요리 참고 용도의 프로토타입입니다.
        </p>
      </section>
    </main>
  );
}

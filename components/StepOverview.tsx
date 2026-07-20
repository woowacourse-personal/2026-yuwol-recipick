// 요리 순서 미리보기 (PRD §8 화면3). 전체 스텝 축약 표시, 탭 시 쿠킹모드 해당 스텝으로 이동.
import Link from "next/link";
import type { Step } from "@/lib/types";
import { formatTime } from "@/lib/format";

export function StepOverview({
  recipeId,
  steps,
}: {
  recipeId: string;
  steps: Step[];
}) {
  return (
    <ol className="space-y-2">
      {steps.map((s) => (
        <li key={s.order}>
          <Link
            href={`/recipe/${recipeId}/cook?step=${s.order}`}
            className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 active:bg-neutral-50"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
              {s.order}
            </span>
            <span className="flex-1 leading-snug">{s.summary || s.text}</span>
            {s.startTime !== undefined && (
              <span className="shrink-0 text-xs text-neutral-400">
                {formatTime(s.startTime)}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}

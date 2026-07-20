"use client";

// 레시피 카테고리 지정 UI (재사용). 지정된 카테고리는 삭제 버튼(×)으로 관리하고,
// 새 카테고리는 입력으로 추가, 기존 카테고리는 "+칩"으로 빠르게 다시 붙인다.
import { useState } from "react";

export function CategoryPicker({
  value,
  existing,
  onChange,
  onRemoveExisting,
}: {
  value: string[];
  existing: string[]; // 전역에 존재하는 카테고리들
  onChange: (next: string[]) => void;
  onRemoveExisting?: (cat: string) => void; // 전역 목록에서 완전 삭제 (제공 시 제안 칩에 ✕ 노출)
}) {
  const [draft, setDraft] = useState("");

  function add(cat: string) {
    const v = cat.trim();
    if (!v || value.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...value, v]);
    setDraft("");
  }

  function remove(cat: string) {
    onChange(value.filter((c) => c !== cat));
  }

  function removeExisting(cat: string) {
    if (!onRemoveExisting) return;
    if (confirm(`'${cat}' 카테고리를 완전히 삭제할까요? 모든 레시피에서 함께 제거돼요.`)) {
      onRemoveExisting(cat);
    }
  }

  // 아직 지정되지 않은 기존 카테고리 — 재입력 없이 탭으로 추가.
  const suggestions = existing.filter((c) => !value.includes(c));

  return (
    <div>
      {/* 지정된 카테고리 — 각 칩의 ✕로 삭제 */}
      <div className="flex flex-wrap gap-2">
        {value.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-full bg-brand-500 py-1.5 pl-3 pr-1.5 text-sm font-medium text-white"
          >
            {c}
            <button
              onClick={() => remove(c)}
              aria-label={`${c} 삭제`}
              className="flex h-5 w-5 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              ✕
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span className="py-1 text-sm text-neutral-400">지정된 카테고리가 없어요.</span>
        )}
      </div>

      {/* 새 카테고리 입력 */}
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // 한글 IME 조합 중 Enter는 조합 확정용이므로 추가로 처리하지 않는다.
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="새 카테고리 (예: 자취요리, 손님상)"
          className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-600 disabled:opacity-40"
        >
          추가
        </button>
      </div>

      {/* 기존 카테고리에서 빠르게 추가 — 칩 본체 탭은 추가, ✕는 전역에서 완전 삭제 */}
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((c) => (
            <span
              key={c}
              className="inline-flex items-center rounded-full border border-neutral-300 text-xs text-neutral-500"
            >
              <button
                onClick={() => add(c)}
                className="py-1 pl-2.5 pr-1.5 transition-colors hover:text-brand-600"
              >
                + {c}
              </button>
              {onRemoveExisting && (
                <button
                  onClick={() => removeExisting(c)}
                  aria-label={`${c} 카테고리 완전 삭제`}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-300 transition-colors hover:text-red-500"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

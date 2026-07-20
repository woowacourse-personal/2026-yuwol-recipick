"use client";

// 레시피 카테고리 지정 UI (재사용). 현재 선택 + 기존 카테고리 토글 + 새 카테고리 추가.
import { useState } from "react";

export function CategoryPicker({
  value,
  existing,
  onChange,
}: {
  value: string[];
  existing: string[]; // 전역에 존재하는 카테고리들
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function toggle(cat: string) {
    onChange(value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat]);
  }

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft("");
  }

  // 선택된 것 + 미선택 기존 것 모두 노출(선택된 게 앞).
  const all = [...new Set([...value, ...existing])];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {all.map((c) => {
          const selected = value.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                selected
                  ? "bg-brand-500 font-medium text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {c}
              {selected && <span className="ml-1 text-white/80">✓</span>}
            </button>
          );
        })}
        {all.length === 0 && (
          <span className="py-1 text-sm text-neutral-400">아직 카테고리가 없어요.</span>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="새 카테고리 (예: 자취요리, 손님상)"
          className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-600 disabled:opacity-40"
        >
          추가
        </button>
      </div>
    </div>
  );
}

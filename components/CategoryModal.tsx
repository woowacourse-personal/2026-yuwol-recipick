"use client";

// 저장 성공 후 카테고리 선택 모달 (PRD §8 화면2). 기존 선택 + 새로 추가.
import { useState } from "react";

export function CategoryModal({
  title,
  existing,
  onConfirm,
  onCancel,
}: {
  title: string;
  existing: string[];
  onConfirm: (categories: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [custom, setCustom] = useState<string[]>([]);

  const all = [...existing, ...custom.filter((c) => !existing.includes(c))];

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function addCustom() {
    const name = draft.trim();
    if (!name) return;
    if (!all.includes(name)) setCustom((c) => [...c, name]);
    setSelected((prev) => new Set(prev).add(name));
    setDraft("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <h2 className="text-lg font-bold">카테고리 선택</h2>
        <p className="mt-1 line-clamp-1 text-sm text-neutral-500">{title}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {all.map((cat) => (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                selected.has(cat)
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {cat}
            </button>
          ))}
          {all.length === 0 && (
            <p className="text-sm text-neutral-400">아직 카테고리가 없어요. 새로 추가해보세요.</p>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) addCustom();
            }}
            placeholder="새 카테고리"
            className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            onClick={addCustom}
            className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium"
          >
            추가
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-neutral-300 py-3 font-medium"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm([...selected])}
            className="flex-1 rounded-xl bg-neutral-900 py-3 font-medium text-white"
          >
            담기
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

// 레시피 카테고리 지정 UI (재사용).
// 모든 카테고리를 한 영역의 "토글 칩"으로 통합해 지정됨/미지정을 스타일로만 구분한다.
//  - 칩 본체 탭 = 이 레시피에 지정/해제 토글 (지정됨=주황 채움, 미지정=아웃라인)
//  - 칩의 ✕ = 카테고리를 전역에서 완전 삭제 (모든 칩에서 의미 동일)
//  - 새 카테고리는 입력으로 추가되며 곧바로 같은 칩 영역에 지정 상태로 합류
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
  onRemoveExisting?: (cat: string) => void; // 전역 목록에서 완전 삭제 (제공 시 칩에 ✕ 노출)
}) {
  const [draft, setDraft] = useState("");

  // 지정 여부와 무관하게 모든 카테고리를 한 곳에 모은다. 순서는 안정적으로(기존 목록 순서 유지)
  // 두어 토글 시 칩이 이동하지 않게 한다. 아직 전역에 없는 갓 추가분만 뒤에 붙인다.
  const all = [...new Set([...existing, ...value])];

  function toggle(cat: string) {
    onChange(value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat]);
  }

  function add(cat: string) {
    const v = cat.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  }

  function removeExisting(cat: string) {
    if (!onRemoveExisting) return;
    if (confirm(`'${cat}' 카테고리를 완전히 삭제할까요? 모든 레시피에서 함께 제거돼요.`)) {
      onRemoveExisting(cat);
    }
  }

  return (
    <div>
      {/* 통합 토글 칩 — 지정됨(주황)/미지정(아웃라인)을 스타일로만 구분 */}
      {all.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {all.map((c) => {
            const on = value.includes(c);
            return (
              <span
                key={c}
                className={`inline-flex items-center rounded-full border text-sm font-medium ${
                  on
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-neutral-300 bg-white text-neutral-600"
                }`}
              >
                <button
                  onClick={() => toggle(c)}
                  aria-pressed={on}
                  className="py-1.5 pl-3 pr-1.5"
                >
                  {c}
                </button>
                {onRemoveExisting && (
                  <button
                    onClick={() => removeExisting(c)}
                    aria-label={`${c} 카테고리 완전 삭제`}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      on ? "text-white/60 hover:text-white" : "text-neutral-300 hover:text-red-500"
                    }`}
                  >
                    ✕
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* 새 카테고리 입력 — 추가하면 같은 칩 영역에 지정 상태로 합류 */}
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

      {all.length === 0 && (
        <p className="mt-2 text-xs text-neutral-400">
          카테고리를 추가하면 나중에 이 기준으로 레시피를 모아 볼 수 있어요.
        </p>
      )}
    </div>
  );
}

"use client";

// 인분 설정 + 조정 + 재료 체크리스트 (벤지 요청, 이후 재설계). [[2026-07-22-interviews-v5-6people]]
// 두 개념을 분리한다:
//  - 기준 인분(base): 이 레시피 원본이 몇 인분이냐. LLM이 제안하되 불확실 → 사용자가 확정/수정,
//    "모름"도 가능(볼 때는 모를 수 있으니). 값은 recipe.servings에 저장(onChangeBase).
//  - 만들 양(target): 내가 몇 인분 만들거냐. 기준이 있어야 재료 양을 조절할 수 있다(양념은 완만 보정).
// 기준이 "모름"이면 스케일하지 않고 원본 양을 그대로 보여준다.
import { useEffect, useState } from "react";
import type { Ingredient } from "@/lib/types";
import { IngredientChecklist } from "./IngredientChecklist";
import { servingOptions } from "@/lib/servings";

const BASE_CHOICES = [1, 2, 3, 4, 5, 6];

export function ServingsIngredients({
  ingredients,
  baseServings,
  onChangeBase,
}: {
  ingredients: Ingredient[];
  baseServings?: number; // 기준 인분 (undefined = 모름)
  onChangeBase?: (servings: number | undefined) => void; // 기준 인분 저장
}) {
  const [target, setTarget] = useState<number | undefined>(baseServings);
  // 기준이 바뀌면 만들 양도 기준값으로 재설정.
  useEffect(() => setTarget(baseServings), [baseServings]);

  const factor = baseServings && target ? target / baseServings : 1;
  const targetChoices = baseServings ? servingOptions(baseServings) : [];

  return (
    <div>
      <div className="mb-3 space-y-2 rounded-xl bg-neutral-50 p-3">
        {/* 기준 인분 — 사용자가 확정/수정, 모름 가능 */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-neutral-500">이 레시피 기준</span>
          <select
            value={baseServings ?? ""}
            onChange={(e) =>
              onChangeBase?.(e.target.value ? Number(e.target.value) : undefined)
            }
            className="ml-auto rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm font-medium"
          >
            <option value="">모름</option>
            {BASE_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}인분
              </option>
            ))}
          </select>
        </div>

        {/* 만들 양 — 기준이 있을 때만 조절 가능 */}
        {baseServings ? (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-neutral-500">만들 양</span>
            <div className="ml-auto flex items-center overflow-hidden rounded-lg border border-neutral-200">
              {targetChoices.map((n) => (
                <button
                  key={n}
                  onClick={() => setTarget(n)}
                  className={`min-w-9 px-2.5 py-1 text-sm ${
                    n === target
                      ? "bg-neutral-900 font-semibold text-white"
                      : "bg-white text-neutral-600"
                  }`}
                >
                  {n}인분
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-neutral-400">
            몇 인분 기준인지 정하면 재료 양을 조절해 드려요.
          </p>
        )}
      </div>

      <IngredientChecklist ingredients={ingredients} factor={factor} />

      {baseServings && target !== baseServings && (
        <p className="mt-2 text-xs leading-relaxed text-neutral-400">
          양은 대략값이에요. 양념은 완만하게 조정했으니 간은 기호에 맞게 조절하세요.
        </p>
      )}
    </div>
  );
}

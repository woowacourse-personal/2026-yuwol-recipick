"use client";

// 인분 조정 + 재료 체크리스트 (벤지 요청: "몇 인분 기준 + 인분 조정"). [[2026-07-22-interviews-v5-6people]]
// 기준 인분(baseServings)이 있으면 조정 컨트롤을 노출하고, 재료 계량을 배수로 스케일링한다.
// 기준 인분이 없으면 조정 없이 원본 재료만 보여준다.
import { useState } from "react";
import type { Ingredient } from "@/lib/types";
import { IngredientChecklist } from "./IngredientChecklist";
import { servingOptions } from "@/lib/servings";

export function ServingsIngredients({
  ingredients,
  baseServings,
}: {
  ingredients: Ingredient[];
  baseServings?: number;
}) {
  const [target, setTarget] = useState<number | undefined>(baseServings);

  const factor = baseServings && target ? target / baseServings : 1;
  const options = baseServings ? servingOptions(baseServings) : [];

  return (
    <div>
      {baseServings && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-neutral-500">
            원본 {baseServings}인분 기준
          </span>
          <div className="ml-auto flex items-center overflow-hidden rounded-lg border border-neutral-200">
            {options.map((n) => (
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
      )}
      <IngredientChecklist ingredients={ingredients} factor={factor} />
    </div>
  );
}

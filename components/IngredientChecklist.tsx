"use client";

// 재료 체크리스트 (PRD §8 화면3). 기본/특수 재료 섹션 분리, 기본은 접힘 (파라디 요청).
import { useMemo, useState } from "react";
import type { Ingredient } from "@/lib/types";
import { scaleAmount } from "@/lib/servings";

export function IngredientChecklist({
  ingredients,
  factor = 1,
}: {
  ingredients: Ingredient[];
  factor?: number; // 인분 조정 배수 (기준 인분 대비). 1이면 원본 그대로.
}) {
  const { special, basic } = useMemo(() => {
    return {
      special: ingredients.filter((i) => !i.isBasic),
      basic: ingredients.filter((i) => i.isBasic),
    };
  }, [ingredients]);

  const [checked, setChecked] = useState<Set<string>>(new Set());
  // 기본 양념도 펼침이 디폴트 — 접힘이 기본이라 안 보인다는 지적(이안·송송).
  const [basicOpen, setBasicOpen] = useState(true);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const row = (ing: Ingredient, key: string) => {
    const isChecked = checked.has(key);
    return (
      <button
        key={key}
        onClick={() => toggle(key)}
        className="flex w-full items-center gap-3 py-2.5 text-left"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
            isChecked ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
          }`}
        >
          {isChecked && "✓"}
        </span>
        <span
          className={`flex-1 text-lg ${isChecked ? "text-neutral-400 line-through" : ""}`}
        >
          {ing.name}
        </span>
        {ing.amount && (
          <span className={`text-base ${isChecked ? "text-neutral-300" : "text-neutral-500"}`}>
            {scaleAmount(ing.amount, factor)}
          </span>
        )}
      </button>
    );
  };

  return (
    <div>
      {special.length > 0 && (
        <p className="pb-1 text-sm font-medium text-neutral-500">
          🛒 장볼 재료 {special.length}개
        </p>
      )}
      <div className="divide-y divide-neutral-100">
        {special.map((ing, i) => row(ing, `s-${i}`))}
      </div>

      {basic.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setBasicOpen((v) => !v)}
            className="flex w-full items-center justify-between py-2 text-sm text-neutral-500"
          >
            <span>기본 양념 {basic.length}개 · 집에 있으면 넘어가세요</span>
            <span>{basicOpen ? "접기 ▲" : "펼치기 ▼"}</span>
          </button>
          {basicOpen && (
            <div className="divide-y divide-neutral-100">
              {basic.map((ing, i) => row(ing, `b-${i}`))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

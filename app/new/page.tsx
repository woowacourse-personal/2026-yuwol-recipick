"use client";

// 직접 작성 (PRD §8 화면6, Phase 6).
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createManualRecipe } from "@/lib/storage";
import { useCategories } from "@/lib/store";
import type { Ingredient, Step } from "@/lib/types";

export default function NewRecipePage() {
  const router = useRouter();
  const existingCats = useCategories();

  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", amount: "", isBasic: false }]);
  const [steps, setSteps] = useState<Step[]>([{ order: 1, text: "", summary: "", memo: "", highlights: [] }]);

  function save() {
    if (!title.trim()) {
      alert("제목을 입력해주세요");
      return;
    }
    const recipe = createManualRecipe({
      title: title.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      categories,
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.filter((s) => s.text.trim()),
    });
    router.push(`/recipe/${recipe.id}`);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28">
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="text-neutral-400">‹ 취소</Link>
        <h1 className="font-semibold">직접 작성</h1>
        <span className="w-10" />
      </header>

      <label className="block text-sm font-medium text-neutral-500">제목 *</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-lg"
      />

      <label className="mt-4 block text-sm font-medium text-neutral-500">원본 링크 (선택)</label>
      <input
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder="https://…"
        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
        inputMode="url"
      />

      <h2 className="mt-6 text-sm font-medium text-neutral-500">카테고리</h2>
      <div className="mt-1 flex flex-wrap gap-2">
        {[...new Set([...existingCats, ...categories])].map((c) => (
          <button
            key={c}
            onClick={() =>
              setCategories((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))
            }
            className={`rounded-full px-3 py-1 text-sm ${
              categories.includes(c) ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <CategoryAdder onAdd={(c) => setCategories((cs) => (cs.includes(c) ? cs : [...cs, c]))} />

      <h2 className="mt-6 text-sm font-medium text-neutral-500">재료</h2>
      <div className="mt-1 space-y-2">
        {ingredients.map((ing, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={ing.name}
              onChange={(e) =>
                setIngredients((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
              }
              placeholder="재료명"
              className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <input
              value={ing.amount}
              onChange={(e) =>
                setIngredients((arr) => arr.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))
              }
              placeholder="계량"
              className="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <button
              onClick={() =>
                setIngredients((arr) => arr.map((x, j) => (j === i ? { ...x, isBasic: !x.isBasic } : x)))
              }
              className={`rounded-lg px-2 py-1.5 text-xs ${ing.isBasic ? "bg-neutral-200" : "bg-neutral-900 text-white"}`}
            >
              {ing.isBasic ? "기본" : "특수"}
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => setIngredients((arr) => [...arr, { name: "", amount: "", isBasic: false }])}
        className="mt-2 text-sm text-neutral-500 underline"
      >
        + 재료 추가
      </button>

      <h2 className="mt-6 text-sm font-medium text-neutral-500">조리 순서</h2>
      <div className="mt-1 space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 p-3">
            <span className="text-sm font-bold">{i + 1}단계</span>
            <textarea
              value={s.text}
              onChange={(e) =>
                setSteps((arr) => arr.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
              }
              placeholder="조리 지시"
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <input
              value={s.memo}
              onChange={(e) =>
                setSteps((arr) => arr.map((x, j) => (j === i ? { ...x, memo: e.target.value } : x)))
              }
              placeholder="📝 내 메모"
              className="mt-2 w-full rounded-lg border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() =>
          setSteps((arr) => [
            ...arr,
            { order: arr.length + 1, text: "", summary: "", memo: "", highlights: [] },
          ])
        }
        className="mt-2 text-sm text-neutral-500 underline"
      >
        + 스텝 추가
      </button>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-neutral-200 bg-white p-3">
        <button
          onClick={save}
          className="block w-full rounded-2xl bg-neutral-900 py-4 text-center text-lg font-bold text-white"
        >
          저장
        </button>
      </div>
    </main>
  );
}

function CategoryAdder({ onAdd }: { onAdd: (c: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            onAdd(draft.trim());
            setDraft("");
          }
        }}
        placeholder="새 카테고리 후 Enter"
        className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

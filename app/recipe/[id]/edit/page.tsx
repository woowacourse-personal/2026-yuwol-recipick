"use client";

// 수정 모드 (PRD §8 화면5, Phase 6). 인라인 수정: 제목·카테고리·재료·스텝·스텝별 메모.
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRecipe } from "@/lib/store";
import { updateRecipe, deleteRecipe, addCategory } from "@/lib/storage";
import type { Ingredient, Step } from "@/lib/types";

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const recipe = useRecipe(id);

  const [title, setTitle] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [catDraft, setCatDraft] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (recipe && !loaded) {
      setTitle(recipe.title);
      setCategories(recipe.categories);
      setIngredients(recipe.ingredients.map((i) => ({ ...i })));
      setSteps(recipe.steps.map((s) => ({ ...s })));
      setLoaded(true);
    }
  }, [recipe, loaded]);

  if (!recipe) {
    return (
      <main className="p-6 text-center text-neutral-400">
        <p>레시피를 찾을 수 없어요.</p>
        <Link href="/" className="mt-2 inline-block underline">홈으로</Link>
      </main>
    );
  }

  function save() {
    const cleanSteps = steps
      .filter((s) => s.text.trim())
      .map((s, i) => ({ ...s, order: i + 1 }));
    categories.forEach(addCategory);
    updateRecipe(recipe!.id, {
      title: title.trim() || recipe!.title,
      categories,
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: cleanSteps,
    });
    router.push(`/recipe/${recipe!.id}`);
  }

  function remove() {
    if (confirm("이 레시피를 삭제할까요?")) {
      deleteRecipe(recipe!.id);
      router.push("/");
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28">
      <header className="flex items-center justify-between py-4">
        <Link href={`/recipe/${recipe.id}`} className="text-neutral-400">‹ 취소</Link>
        <button onClick={remove} className="text-sm text-red-500">삭제</button>
      </header>

      <label className="block text-sm font-medium text-neutral-500">제목</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-lg"
      />

      {/* 카테고리 */}
      <h2 className="mt-6 text-sm font-medium text-neutral-500">카테고리</h2>
      <div className="mt-1 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategories((cs) => cs.filter((x) => x !== c))}
            className="rounded-full bg-neutral-900 px-3 py-1 text-sm text-white"
          >
            {c} ✕
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={catDraft}
          onChange={(e) => setCatDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = catDraft.trim();
              if (v && !categories.includes(v)) setCategories((cs) => [...cs, v]);
              setCatDraft("");
            }
          }}
          placeholder="카테고리 추가 후 Enter"
          className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {/* 재료 */}
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
              title="기본 재료 여부"
            >
              {ing.isBasic ? "기본" : "특수"}
            </button>
            <button
              onClick={() => setIngredients((arr) => arr.filter((_, j) => j !== i))}
              className="text-neutral-300"
              aria-label="삭제"
            >
              ✕
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

      {/* 스텝 */}
      <h2 className="mt-6 text-sm font-medium text-neutral-500">조리 순서</h2>
      <div className="mt-1 space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-bold">{i + 1}단계</span>
              <button
                onClick={() => setSteps((arr) => arr.filter((_, j) => j !== i))}
                className="text-neutral-300"
                aria-label="스텝 삭제"
              >
                ✕
              </button>
            </div>
            <textarea
              value={s.text}
              onChange={(e) =>
                setSteps((arr) => arr.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
              }
              placeholder="조리 지시"
              rows={2}
              className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <input
              value={s.memo}
              onChange={(e) =>
                setSteps((arr) => arr.map((x, j) => (j === i ? { ...x, memo: e.target.value } : x)))
              }
              placeholder="📝 내 메모 (변형한 부분 등)"
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
          수정 완료
        </button>
      </div>
    </main>
  );
}

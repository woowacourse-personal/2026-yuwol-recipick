"use client";

// 레시피 추가 (PRD §8 화면6, Phase 6).
// 두 모드: (1) 붙여넣기 — 자유 형식 글을 LLM이 정리(자막 없는 영상 대안), (2) 직접 입력 — 수기 작성.
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createManualRecipe, createRecipeFromText } from "@/lib/storage";
import { useCategories } from "@/lib/store";
import type { Ingredient, ParsedRecipe, Step } from "@/lib/types";
import { CategoryModal } from "@/components/CategoryModal";
import { ParsingIndicator, Spinner } from "@/components/ParsingIndicator";

type Mode = "paste" | "manual";

// 텍스트 파싱 대기 중 순차 안내 문구.
const TEXT_STAGES = [
  "붙여넣은 내용을 읽고 있어요…",
  "재료와 조리 순서로 정리하는 중이에요…",
  "거의 다 됐어요…",
];

export default function NewRecipePage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh max-w-md px-4 py-8" />}>
      <NewRecipeInner />
    </Suspense>
  );
}

function NewRecipeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const existingCats = useCategories();

  const [mode, setMode] = useState<Mode>(params.get("mode") === "manual" ? "manual" : "paste");

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28">
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="text-neutral-400">‹ 취소</Link>
        <h1 className="font-semibold">레시피 추가</h1>
        <span className="w-10" />
      </header>

      {/* 모드 토글 */}
      <div className="flex rounded-xl bg-neutral-100 p-1 text-sm font-medium">
        <button
          onClick={() => setMode("paste")}
          className={`flex-1 rounded-lg py-2 ${mode === "paste" ? "bg-white shadow-sm" : "text-neutral-500"}`}
        >
          붙여넣기
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-lg py-2 ${mode === "manual" ? "bg-white shadow-sm" : "text-neutral-500"}`}
        >
          직접 입력
        </button>
      </div>

      {mode === "paste" ? (
        <PasteForm defaultUrl={params.get("url") ?? ""} existingCats={existingCats} router={router} />
      ) : (
        <ManualForm existingCats={existingCats} router={router} />
      )}
    </main>
  );
}

type Router = ReturnType<typeof useRouter>;

// ---- 붙여넣기 모드 (AI 정리) ----
function PasteForm({
  defaultUrl,
  existingCats,
  router,
}: {
  defaultUrl: string;
  existingCats: string[];
  router: Router;
}) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState(defaultUrl);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ParsedRecipe | null>(null);

  async function parse() {
    if (text.trim().length < 10) {
      setError("정리할 레시피 내용을 조금 더 붙여넣어 주세요");
      return;
    }
    setError(null);
    setParsing(true);
    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), title: title.trim() || undefined, url: sourceUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (data.ok) setPending(data.recipe);
      else setError(data.error ?? "정리에 실패했어요. 내용을 확인해 주세요");
    } catch {
      setError("네트워크 오류가 발생했어요");
    } finally {
      setParsing(false);
    }
  }

  function confirmSave(cats: string[]) {
    if (!pending) return;
    const recipe = createRecipeFromText({
      parsed: pending,
      sourceUrl: sourceUrl.trim() || undefined,
      categories: cats,
    });
    setPending(null);
    router.push(`/recipe/${recipe.id}`);
  }

  return (
    <>
      <p className="mt-4 text-sm text-neutral-500">
        블로그 글, 영상 설명란, 손으로 적은 메모 — 재료·조리법을 <span className="font-medium text-neutral-700">아무 형식으로나</span> 붙여넣으면 단계별 레시피로 정리해 드려요.
      </p>

      <label className="mt-4 block text-sm font-medium text-neutral-500">레시피 내용 *</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={"예)\n김치찌개\n돼지고기 200g, 신김치 1/4포기, 두부 반 모, 대파, 다진마늘 1큰술\n\n1. 냄비에 기름 두르고 돼지고기를 볶는다\n2. 김치를 넣고 같이 볶다가 물 2컵을 붓는다\n3. 끓으면 두부와 대파를 넣고 10분 더 끓인다"}
        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm leading-relaxed"
      />

      <label className="mt-4 block text-sm font-medium text-neutral-500">제목 (선택 — 비우면 AI가 추출)</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="요리 이름"
        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
      />

      <label className="mt-4 block text-sm font-medium text-neutral-500">원본 링크 (선택)</label>
      <input
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder="https://…"
        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
        inputMode="url"
      />

      {parsing && <ParsingIndicator messages={TEXT_STAGES} className="mt-4" />}
      {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-neutral-200 bg-white p-3">
        <button
          onClick={parse}
          disabled={parsing || !text.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-4 text-center text-lg font-bold text-white disabled:opacity-40"
        >
          {parsing && <Spinner className="h-5 w-5" />}
          {parsing ? "정리 중…" : "레시피로 정리하기"}
        </button>
      </div>

      {pending && (
        <CategoryModal
          title={pending.title}
          existing={existingCats}
          onConfirm={confirmSave}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

// ---- 직접 입력 모드 (수기 작성) ----
function ManualForm({ existingCats, router }: { existingCats: string[]; router: Router }) {
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
    <>
      <label className="mt-4 block text-sm font-medium text-neutral-500">제목 *</label>
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
          담기
        </button>
      </div>
    </>
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
          // 한글 IME 조합 중 Enter는 조합 확정용 — 마지막 글자 중복 입력 방지.
          if (e.key === "Enter" && !e.nativeEvent.isComposing && draft.trim()) {
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

"use client";

// 홈 · 아카이브 (PRD §8 화면1). URL 저장 + 클립보드 감지 + 검색/필터/정렬 + 레시피 목록.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRecipes, useCategories } from "@/lib/store";
import { createRecipeFromParsed, isClipboardSeen, markClipboardSeen } from "@/lib/storage";
import { extractVideoId, isYouTubeUrl, thumbnailUrl } from "@/lib/youtube";
import { filterRecipes, DEFAULT_FILTER, type FilterState, type MediaFilter, type SortMode } from "@/lib/search";
import type { ParsedRecipe } from "@/lib/types";
import { RecipeCard } from "@/components/RecipeCard";
import { CategoryModal } from "@/components/CategoryModal";

type Pending = { parsed: ParsedRecipe; videoId: string; sourceUrl: string } | null;

export default function HomePage() {
  const router = useRouter();
  const recipes = useRecipes();
  const categories = useCategories();

  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  // 클립보드 자동 감지 (PRD §8) — 진입 시 유튜브 URL이 있으면 배너 제안
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const checkedClip = useRef(false);
  useEffect(() => {
    if (checkedClip.current) return;
    checkedClip.current = true;
    const nav = navigator as Navigator & { clipboard?: { readText?: () => Promise<string> } };
    nav.clipboard?.readText?.()
      .then((text) => {
        const trimmed = text.trim();
        if (isYouTubeUrl(trimmed) && !isClipboardSeen(trimmed)) setClipUrl(trimmed);
      })
      .catch(() => {
        /* 권한 거부는 무시 (PRD §12) */
      });
  }, []);

  async function handleSave(rawUrl: string) {
    const target = rawUrl.trim();
    if (!target) return;
    setError(null);

    const videoId = extractVideoId(target);
    if (!videoId) {
      setError("현재는 유튜브만 지원합니다");
      return;
    }

    // 중복 URL: 이미 저장된 레시피면 그리로 이동 (PRD §12)
    const existing = recipes.find((r) => r.videoId === videoId);
    if (existing) {
      router.push(`/recipe/${existing.id}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (data.ok) {
        setPending({ parsed: data.recipe, videoId: data.videoId, sourceUrl: target });
        setUrl("");
      } else {
        setError(data.error ?? "저장에 실패했습니다");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  }

  function confirmSave(cats: string[]) {
    if (!pending) return;
    const recipe = createRecipeFromParsed({
      parsed: pending.parsed,
      sourceUrl: pending.sourceUrl,
      videoId: pending.videoId,
      thumbnail: thumbnailUrl(pending.videoId),
      categories: cats,
    });
    setPending(null);
    router.push(`/recipe/${recipe.id}`);
  }

  const visible = useMemo(() => filterRecipes(recipes, filter), [recipes, filter]);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-24">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold">레시픽</h1>
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <Link href="/new">직접 작성</Link>
          <Link href="/settings">설정</Link>
        </div>
      </header>

      {/* 클립보드 감지 배너 */}
      {clipUrl && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-neutral-900 p-3 text-sm text-white">
          <span className="flex-1">복사한 유튜브 링크를 저장할까요?</span>
          <button
            onClick={() => {
              markClipboardSeen(clipUrl);
              handleSave(clipUrl);
              setClipUrl(null);
            }}
            className="rounded-lg bg-white px-3 py-1 font-medium text-neutral-900"
          >
            저장
          </button>
          <button
            onClick={() => {
              markClipboardSeen(clipUrl);
              setClipUrl(null);
            }}
            aria-label="닫기"
            className="px-1 text-neutral-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* URL 입력 */}
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave(url)}
          placeholder="유튜브 레시피 URL 붙여넣기"
          className="flex-1 rounded-xl border border-neutral-300 px-3 py-3"
          inputMode="url"
        />
        <button
          onClick={() => handleSave(url)}
          disabled={saving || !url}
          className="rounded-xl bg-neutral-900 px-5 font-medium text-white disabled:opacity-40"
        >
          {saving ? "분석중" : "저장"}
        </button>
      </div>
      {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {/* 검색 */}
      <input
        value={filter.query}
        onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
        placeholder="제목·재료·태그 검색 (예: 면)"
        className="mt-4 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm"
      />

      {/* 카테고리 탭 */}
      {categories.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Tab active={filter.category === null} onClick={() => setFilter((f) => ({ ...f, category: null }))}>
            전체
          </Tab>
          {categories.map((c) => (
            <Tab key={c} active={filter.category === c} onClick={() => setFilter((f) => ({ ...f, category: c }))}>
              {c}
            </Tab>
          ))}
        </div>
      )}

      {/* 매체 필터 + 정렬 */}
      <div className="mt-3 flex items-center gap-2 text-sm">
        <select
          value={filter.media}
          onChange={(e) => setFilter((f) => ({ ...f, media: e.target.value as MediaFilter }))}
          className="rounded-lg border border-neutral-200 px-2 py-1.5"
        >
          <option value="all">전체</option>
          <option value="youtube">영상 참고</option>
          <option value="manual">직접 작성</option>
        </select>
        <select
          value={filter.sort}
          onChange={(e) => setFilter((f) => ({ ...f, sort: e.target.value as SortMode }))}
          className="rounded-lg border border-neutral-200 px-2 py-1.5"
        >
          <option value="recentSave">최근 저장순</option>
          <option value="recentView">최근 조회순</option>
          <option value="mostView">자주 조회순</option>
        </select>
      </div>

      {/* 목록 */}
      <section className="mt-4 space-y-3">
        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-400">
            {recipes.length === 0
              ? "유튜브 레시피 URL을 붙여넣어 첫 레시피를 저장해보세요."
              : "조건에 맞는 레시피가 없어요."}
          </p>
        ) : (
          visible.map((r) => <RecipeCard key={r.id} recipe={r} />)
        )}
      </section>

      {pending && (
        <CategoryModal
          title={pending.parsed.title}
          existing={categories}
          onConfirm={confirmSave}
          onCancel={() => setPending(null)}
        />
      )}
    </main>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
        active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
      }`}
    >
      {children}
    </button>
  );
}

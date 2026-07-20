"use client";

// 아카이빙 (PRD §8 화면1의 목록 영역). 저장한 레시피 브라우징 — 검색·카테고리·매체 필터·정렬.
import { useMemo, useState } from "react";
import { useRecipes, useCategories } from "@/lib/store";
import { filterRecipes, DEFAULT_FILTER, type FilterState, type MediaFilter, type SortMode } from "@/lib/search";
import { RecipeCard } from "@/components/RecipeCard";
import { TabBar } from "@/components/TabBar";

export default function ArchivePage() {
  const recipes = useRecipes();
  const categories = useCategories();
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  const visible = useMemo(() => filterRecipes(recipes, filter), [recipes, filter]);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-24">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold">아카이빙</h1>
        <span className="text-sm text-neutral-400">{recipes.length}개</span>
      </header>

      {/* 검색 */}
      <input
        value={filter.query}
        onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
        placeholder="제목·재료·태그 검색 (예: 면)"
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm"
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
              ? "아직 담은 레시피가 없어요. 홈에서 유튜브 URL을 붙여넣어 시작해보세요."
              : "조건에 맞는 레시피가 없어요."}
          </p>
        ) : (
          visible.map((r) => <RecipeCard key={r.id} recipe={r} />)
        )}
      </section>

      <TabBar />
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

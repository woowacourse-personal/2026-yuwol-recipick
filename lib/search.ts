// 검색·필터·정렬 (PRD §8 홈, Phase 7). 순수 함수.
import type { Recipe } from "./types";

export type MediaFilter = "all" | "youtube" | "manual";
export type SortMode = "recentView" | "recentSave" | "mostView";

export type FilterState = {
  query: string;
  category: string | null; // null = 전체
  media: MediaFilter;
  sort: SortMode;
};

export const DEFAULT_FILTER: FilterState = {
  query: "",
  category: null,
  media: "all",
  sort: "recentSave",
};

/**
 * 통합 검색: 제목·태그·재료명·카테고리에 대해 부분 문자열 매칭.
 * 파라디 요청: "면" 검색 → 재료 "파스타면"/"우동면" 등 부분 매칭으로 함께 노출.
 */
function matchesQuery(recipe: Recipe, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystacks = [
    recipe.title,
    ...recipe.tags,
    ...recipe.categories,
    ...recipe.ingredients.map((i) => i.name),
    recipe.channelName ?? "",
  ];
  return haystacks.some((h) => h.toLowerCase().includes(needle));
}

export function filterRecipes(recipes: Recipe[], f: FilterState): Recipe[] {
  const filtered = recipes.filter((r) => {
    if (!matchesQuery(r, f.query)) return false;
    if (f.category && !r.categories.includes(f.category)) return false;
    if (f.media !== "all" && r.sourceType !== f.media) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (f.sort) {
    case "recentView":
      sorted.sort((a, b) => b.lastAccessedAt.localeCompare(a.lastAccessedAt));
      break;
    case "recentSave":
      sorted.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      break;
    case "mostView":
      sorted.sort((a, b) => b.accessCount - a.accessCount);
      break;
  }
  return sorted;
}

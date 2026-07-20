// localStorage 데이터 계층 — 레시피 CRUD + 로깅 + 카테고리 + 뷰모드 + 로그 내보내기.
// 순수 함수 + 구독 이벤트. React 바인딩은 lib/store.ts.

import type {
  Recipe,
  ParsedRecipe,
  UsageLog,
  UsageEvent,
  Ingredient,
  Step,
} from "./types";
import { newId } from "./id";

const KEYS = {
  recipes: "recipick:recipes",
  logs: "recipick:logs",
  categories: "recipick:categories",
  viewMode: "recipick:viewmode",
  clipboardSeen: "recipick:clipboard-seen",
} as const;

export type ViewMode = "cards" | "overview";

// ---- 구독 (useSyncExternalStore용) ----
const listeners = new Set<() => void>();
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((fn) => fn());
}

// ---- 저수준 read/write (SSR 안전) ----
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과 등은 프로토타입에서 무시
  }
}

// ---- 스냅샷 캐시 (useSyncExternalStore 참조 안정성) ----
let recipesCache: Recipe[] | null = null;
export function getRecipes(): Recipe[] {
  if (recipesCache === null) recipesCache = read<Recipe[]>(KEYS.recipes, []);
  return recipesCache;
}
function commitRecipes(next: Recipe[]) {
  recipesCache = next;
  write(KEYS.recipes, next);
  emit();
}

export function getRecipe(id: string): Recipe | undefined {
  return getRecipes().find((r) => r.id === id);
}

// ---- 레시피 생성 ----
export function createRecipeFromParsed(input: {
  parsed: ParsedRecipe;
  sourceUrl: string;
  videoId: string;
  thumbnail: string;
  categories: string[];
}): Recipe {
  const now = new Date().toISOString();
  const recipe: Recipe = {
    id: newId(),
    title: input.parsed.title,
    sourceType: "youtube",
    sourceUrl: input.sourceUrl,
    videoId: input.videoId,
    thumbnail: input.thumbnail,
    channelName: input.parsed.channelName,
    savedAt: now,
    lastAccessedAt: now,
    accessCount: 0,
    categories: input.categories,
    tags: input.parsed.tags,
    ingredients: input.parsed.ingredients,
    steps: normalizeSteps(input.parsed.steps),
  };
  commitRecipes([recipe, ...getRecipes()]);
  logEvent("save", recipe.id, { sourceType: "youtube" });
  input.categories.forEach(addCategory);
  return recipe;
}

export function createManualRecipe(input: {
  title: string;
  sourceUrl?: string;
  categories: string[];
  ingredients: Ingredient[];
  steps: Step[];
}): Recipe {
  const now = new Date().toISOString();
  const recipe: Recipe = {
    id: newId(),
    title: input.title,
    sourceType: "manual",
    sourceUrl: input.sourceUrl || undefined,
    savedAt: now,
    lastAccessedAt: now,
    accessCount: 0,
    categories: input.categories,
    tags: [],
    ingredients: input.ingredients,
    steps: normalizeSteps(input.steps),
  };
  commitRecipes([recipe, ...getRecipes()]);
  logEvent("save", recipe.id, { sourceType: "manual" });
  input.categories.forEach(addCategory);
  return recipe;
}

function normalizeSteps(steps: Step[]): Step[] {
  return steps.map((s, i) => ({
    ...s,
    order: i + 1,
    memo: s.memo ?? "",
    highlights: s.highlights ?? [],
  }));
}

// ---- 레시피 수정/삭제 ----
export function updateRecipe(id: string, patch: Partial<Recipe>) {
  const next = getRecipes().map((r) => (r.id === id ? { ...r, ...patch } : r));
  commitRecipes(next);
}

export function deleteRecipe(id: string) {
  commitRecipes(getRecipes().filter((r) => r.id !== id));
}

/** 조회 기록: accessCount 증가 + lastAccessedAt 갱신 + view 로그. */
export function recordView(id: string) {
  const r = getRecipe(id);
  if (!r) return;
  updateRecipe(id, {
    accessCount: r.accessCount + 1,
    lastAccessedAt: new Date().toISOString(),
  });
  logEvent("view", id);
}

// ---- 카테고리 ----
let categoriesCache: string[] | null = null;
export function getCategories(): string[] {
  if (categoriesCache === null) categoriesCache = read<string[]>(KEYS.categories, []);
  return categoriesCache;
}
export function addCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const cats = getCategories();
  if (!cats.includes(trimmed)) {
    categoriesCache = [...cats, trimmed];
    write(KEYS.categories, categoriesCache);
    emit();
  }
}

// ---- 뷰모드 선호 (마지막 사용 뷰가 기본값 — PRD §8 화면4) ----
export function getViewMode(): ViewMode {
  return read<ViewMode>(KEYS.viewMode, "cards");
}
export function setViewMode(mode: ViewMode) {
  write(KEYS.viewMode, mode);
}

// ---- 클립보드 중복 감지 방지 ----
export function isClipboardSeen(url: string): boolean {
  return read<string[]>(KEYS.clipboardSeen, []).includes(url);
}
export function markClipboardSeen(url: string) {
  const seen = read<string[]>(KEYS.clipboardSeen, []);
  if (!seen.includes(url)) write(KEYS.clipboardSeen, [...seen.slice(-49), url]);
}

// ---- 로깅 (PRD §7·§16 필수) ----
export function logEvent(
  event: UsageEvent,
  recipeId: string,
  metadata?: Record<string, unknown>,
) {
  const logs = read<UsageLog[]>(KEYS.logs, []);
  logs.push({ event, recipeId, timestamp: new Date().toISOString(), metadata });
  write(KEYS.logs, logs);
}
export function getLogs(): UsageLog[] {
  return read<UsageLog[]>(KEYS.logs, []);
}

/** 로그 + 레시피 메타를 카톡/이메일 전달용 JSON 문자열로 내보낸다. */
export function exportData(): string {
  const recipes = getRecipes().map((r) => ({
    id: r.id,
    title: r.title,
    sourceType: r.sourceType,
    videoId: r.videoId,
    savedAt: r.savedAt,
    lastAccessedAt: r.lastAccessedAt,
    accessCount: r.accessCount,
    categories: r.categories,
    tags: r.tags,
    stepCount: r.steps.length,
  }));
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), recipes, logs: getLogs() },
    null,
    2,
  );
}

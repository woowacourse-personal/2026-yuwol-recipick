// React 바인딩 — localStorage 데이터 계층을 useSyncExternalStore로 구독.
"use client";

import { useSyncExternalStore } from "react";
import { subscribe, getRecipes, getRecipe, getCategories } from "./storage";
import type { Recipe } from "./types";

const EMPTY: Recipe[] = [];
const EMPTY_STR: string[] = [];

export function useRecipes(): Recipe[] {
  return useSyncExternalStore(
    subscribe,
    getRecipes,
    () => EMPTY, // 서버 스냅샷 (SSR)
  );
}

export function useRecipe(id: string): Recipe | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getRecipe(id),
    () => undefined,
  );
}

export function useCategories(): string[] {
  return useSyncExternalStore(subscribe, getCategories, () => EMPTY_STR);
}

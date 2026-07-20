"use client";

// 홈 (PRD §8 화면1). 레시피 변환(URL→저장) + 클립보드 감지 + 검색. 전체 목록은 아카이빙 탭.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRecipes, useCategories } from "@/lib/store";
import { createRecipeFromParsed, isClipboardSeen, markClipboardSeen } from "@/lib/storage";
import { extractVideoId, isYouTubeUrl, thumbnailUrl } from "@/lib/youtube";
import { filterRecipes } from "@/lib/search";
import type { ParsedRecipe } from "@/lib/types";
import { RecipeCard } from "@/components/RecipeCard";
import { CategoryModal } from "@/components/CategoryModal";
import { ParsingIndicator, Spinner } from "@/components/ParsingIndicator";
import { TabBar } from "@/components/TabBar";
import { Logo } from "@/components/Logo";

type Pending = { parsed: ParsedRecipe; videoId: string; sourceUrl: string } | null;

// URL 파싱 대기 중 순차 안내 문구.
const URL_STAGES = [
  "영상에서 자막을 읽고 있어요…",
  "레시피를 단계별로 정리하는 중이에요…",
  "거의 다 됐어요…",
];

const RECENT_PREVIEW = 3;

export default function HomePage() {
  const router = useRouter();
  const recipes = useRecipes();
  const categories = useCategories();

  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noTranscriptUrl, setNoTranscriptUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const [query, setQuery] = useState("");

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
    setNoTranscriptUrl(null);

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
      } else if (data.code === "no_transcript") {
        // 자막 없는 영상 → 붙여넣기 경로로 안내 (에러로 막지 않음)
        setNoTranscriptUrl(target);
      } else {
        setError(data.error ?? "레시피를 담지 못했어요");
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

  const trimmedQuery = query.trim();
  const results = useMemo(() => {
    if (trimmedQuery) {
      return filterRecipes(recipes, { query: trimmedQuery, category: null, media: "all", sort: "recentSave" });
    }
    // 검색어 없으면 최근 저장한 몇 개만 미리보기
    return [...recipes]
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .slice(0, RECENT_PREVIEW);
  }, [recipes, trimmedQuery]);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-24">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-bold">레시픽</h1>
        </div>
        <Link href="/settings" className="text-sm text-neutral-500">설정</Link>
      </header>

      {/* 클립보드 감지 배너 */}
      {clipUrl && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-neutral-900 p-3 text-sm text-white">
          <span className="flex-1">복사한 유튜브 링크를 담을까요?</span>
          <button
            onClick={() => {
              markClipboardSeen(clipUrl);
              handleSave(clipUrl);
              setClipUrl(null);
            }}
            className="rounded-lg bg-white px-3 py-1 font-medium text-neutral-900"
          >
            담기
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

      {/* ── 담기 존 (주요 액션) — 브랜드 톤 카드로 뚜렷하게 구분 ── */}
      <section className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-brand-600" aria-hidden="true">▶</span>
          <h2 className="font-bold text-brand-900">유튜브 레시피 담기</h2>
        </div>
        <p className="mt-0.5 text-xs text-brand-700/80">
          URL만 붙여넣으면 단계별 요리 카드로 정리해 드려요.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave(url)}
            placeholder="유튜브 레시피 URL 붙여넣기"
            className="flex-1 rounded-xl border border-brand-200 bg-white px-3 py-3 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            inputMode="url"
          />
          <button
            onClick={() => handleSave(url)}
            disabled={saving || !url}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-5 font-bold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-40"
          >
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? "정리 중" : "담기"}
          </button>
        </div>

        {saving && <ParsingIndicator messages={URL_STAGES} className="mt-2" />}
        {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      </section>

      {/* 자막 없는 영상: 붙여넣기 경로로 안내 */}
      {noTranscriptUrl && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-900">이 영상은 자막이 없어 자동으로 읽을 수 없어요.</p>
          <p className="mt-1 text-amber-800">
            영상 <span className="font-medium">설명란·고정 댓글</span>의 레시피 글을 붙여넣으면 대신 정리해 드려요.
          </p>
          <Link
            href={`/new?mode=paste&url=${encodeURIComponent(noTranscriptUrl)}`}
            className="mt-2 inline-block rounded-lg bg-amber-900 px-3 py-1.5 font-medium text-white"
          >
            붙여넣기로 담기
          </Link>
        </div>
      )}

      {/* ── 구분선: 담기(추가) 과 찾기(검색)의 성격을 분리 ── */}
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs font-medium text-neutral-400">담아둔 레시피</span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      {/* ── 검색 존 (보조) — 아이콘 프리픽스로 '찾기'임을 명확히 ── */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="담아둔 레시피에서 찾기 (제목·재료·태그)"
          className="w-full rounded-full border border-neutral-200 bg-neutral-100 py-2.5 pl-9 pr-3 text-sm focus:border-neutral-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200"
        />
      </div>

      {/* 결과 / 최근 미리보기 */}
      <section className="mt-4 space-y-3">
        {recipes.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-400">
            유튜브 레시피 URL을 붙여넣어 첫 레시피를 담아보세요.
          </p>
        ) : results.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            &lsquo;{trimmedQuery}&rsquo; 검색 결과가 없어요.
          </p>
        ) : (
          <>
            {!trimmedQuery && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">최근 담은 레시피</span>
                <Link href="/archive" className="text-xs font-medium text-neutral-500">
                  전체 보기 →
                </Link>
              </div>
            )}
            {results.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </>
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

      <TabBar />
    </main>
  );
}

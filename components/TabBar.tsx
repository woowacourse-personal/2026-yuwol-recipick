"use client";

// 하단 탭바 — 앱 최상위 내비게이션. 홈(변환+검색) · 레시피 추가 · 아카이빙.
// 자체 하단 CTA가 있는 화면(/new, cook, edit)에는 렌더하지 않고 홈·아카이빙에서만 노출.
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean };

const TABS: Tab[] = [
  {
    href: "/",
    label: "홈",
    match: (p) => p === "/",
    icon: (
      <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    ),
  },
  {
    href: "/new",
    label: "레시피 추가",
    match: (p) => p === "/new",
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    href: "/archive",
    label: "아카이빙",
    match: (p) => p.startsWith("/archive"),
    icon: <path d="M4 7h16M6 7v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7M9 11h6" />,
  },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  active ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.2 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {t.icon}
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* iOS 홈 인디케이터 세이프 에어리어 */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

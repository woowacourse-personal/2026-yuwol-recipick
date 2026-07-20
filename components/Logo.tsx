// 레시픽 로고 마크 — 브랜드 코랄 배지 안에 김 오르는 냄비/그릇(요리 연상).
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-brand-500" />
      {/* 김 */}
      <path
        d="M13 8.5c0-1 1-1.3 1-2.3M16 8c0-1.2 1.1-1.5 1.1-2.7M19 8.5c0-1 1-1.3 1-2.3"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* 그릇 */}
      <path
        d="M8 14.5h16a8 8 0 0 1-8 8 8 8 0 0 1-8-8Z"
        className="fill-white"
      />
      <rect x="6.5" y="12.6" width="19" height="2.4" rx="1.2" className="fill-white" />
    </svg>
  );
}

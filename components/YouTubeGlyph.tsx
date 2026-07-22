// 유튜브 영상 표식 — 기존의 맨 ▶(노션 토글처럼 보인다는 지적, 송송) 대체.
// 둥근 빨간 사각형 + 흰 삼각형 = 보편적으로 인식되는 유튜브 글리프.
export function YouTubeGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="1" y="5" width="22" height="14" rx="4" fill="#FF0000" />
      <path d="M10 8.8l5.5 3.2L10 15.2z" fill="#fff" />
    </svg>
  );
}

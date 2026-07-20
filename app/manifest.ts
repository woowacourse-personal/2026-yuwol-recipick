import type { MetadataRoute } from "next";

// PWA 매니페스트 (PRD §8·§13, Phase 8). "홈 화면에 추가"로 앱처럼 실행.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "레시픽",
    short_name: "레시픽",
    description: "유튜브 레시피를 요리용 카드로 아카이빙하는 서비스",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#FB5E33",
    orientation: "any",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

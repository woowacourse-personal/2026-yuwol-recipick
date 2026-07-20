// 레시픽 데이터 스키마 (v5 개발 프롬프트 §7)
// 프레임워크 독립적으로 유지하여 이후 React Native 이전을 쉽게 한다.

export type HighlightType = "ingredient" | "amount" | "time" | "heat";

export type Highlight = {
  type: HighlightType;
  value: string;
};

export type Ingredient = {
  name: string;
  amount: string;
  isBasic: boolean; // 기본 양념(물/소금/후추 등 상비) vs 장볼 재료(따로 사야 함) (파라디 요청)
};

export type Step = {
  order: number;
  text: string;
  summary: string; // 오버뷰용 1줄 요약
  memo: string; // 유저 메모 (요리 후 본인 변형 기록 — 파도 요청)
  startTime?: number; // 유튜브 타임스탬프 (초)
  endTime?: number;
  highlights: Highlight[];
};

export type RecipeSourceType = "youtube" | "manual";

export type Recipe = {
  id: string;
  title: string;
  sourceType: RecipeSourceType;
  sourceUrl?: string;
  videoId?: string;
  thumbnail?: string;
  channelName?: string;
  savedAt: string;
  lastAccessedAt: string;
  accessCount: number; // 재방문 검증용 (가설 H2)
  categories: string[]; // 사용자 커스텀 카테고리
  tags: string[]; // 자동 추출 태그 (예: "면 요리", "매운맛")
  ingredients: Ingredient[];
  steps: Step[];
};

// Claude Tool Use가 반환하는 파싱 결과 (id/타임스탬프 등 클라이언트 메타 제외)
export type ParsedRecipe = {
  title: string;
  channelName?: string;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
};

export type UsageEvent =
  | "save"
  | "view"
  | "stepMove"
  | "startCooking"
  | "toggleView"
  | "openEmbed";

export type UsageLog = {
  event: UsageEvent;
  recipeId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type TranscriptSegment = {
  text: string;
  startSeconds: number;
  durationSeconds: number;
};

// API 응답 타입
export type ParseRecipeResponse =
  | { ok: true; recipe: ParsedRecipe; videoId: string }
  | { ok: false; error: string; code: ParseErrorCode };

export type ParseErrorCode =
  | "invalid_url"
  | "unsupported_source"
  | "no_transcript"
  | "too_long"
  | "rate_limit"
  | "parse_failed"
  | "server_error";

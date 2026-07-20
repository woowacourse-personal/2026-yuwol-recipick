# 레시픽 (Recipick) — 개발 컨텍스트

> 매 세션 자동 로드되는 압축 컨텍스트. 전체 스펙은 `docs/PRD-v5.md`(원본 프롬프트 전문),
> 결정 근거는 `docs/DECISIONS.md` 참고. **기능을 추가/변경하기 전에 이 두 문서로 맥락을 확인할 것.**

## 한 줄 요약
유튜브 레시피 URL → LLM이 자막 파싱 → 단계별 카드로 변환 → 요리용 포맷으로 아카이빙하는 PWA 프로토타입.
목적은 **가설 4가지 실사용 검증**이지 완성도 높은 제품이 아니다. → 로깅이 존재 이유(§16, `docs/PRD-v5.md`).

## 검증 목적 (PRD §5) — 모든 기능 결정의 기준
1. **카드 뷰 vs 전체 뷰** 중 유저가 뭘 고르는지 (`toggleView` 로그가 핵심 데이터)
2. **임베디드 플레이어**가 요리 상황에서 실제로 쓰이는지 (`openEmbed` 로그)
3. **아카이브 재접근율** (`accessCount`, `view` 로그)
4. **접근성 마찰** — 클립보드 감지·검색이 재방문 트리거로 작동하는지

## 기술 스택
Next.js 15 (App Router) · TypeScript · Tailwind v3 · Vercel Serverless · localStorage(백엔드 없음).
상태관리는 로컬 중심(가벼운 커스텀 store). 배포: main push → Vercel 자동.

## 아키텍처 규칙
- **모바일 우선.** 젖은 손·팔 길이 시야 전제 → 큰 폰트/터치 영역. 데스크탑은 반응형 대응만.
- **카드 UI/데이터는 프레임워크 독립적으로** 설계(이후 React Native 이전 대비).
- **API 키는 서버(Serverless Function)에만.** 클라이언트 노출 금지.
- **동일 URL 캐싱** 필수(API 비용): 서버 인메모리 + 클라 localStorage 양쪽.
- **크리에이터 attribution**(채널명·원본 URL) 항상 유지(저작권).
- **강제 금지**: 자동 넘김·강제 대기 없음. 유저 페이스 존중.
- **스텝은 원자적**: 카드 하나에 한 동작.
- **두 뷰(카드/전체)를 대등하게** 취급 — 어느 쪽도 기본 우위 두지 않고 로그로 관찰.

## 코드 구조
- `lib/types.ts` — 데이터 스키마(단일 진실 소스). `Recipe`, `Step`, `Ingredient`, `UsageLog`.
- `lib/youtube.ts` — videoId 추출, 썸네일/watch URL.
- `lib/transcript.ts` — 자막 추출(youtube-transcript, ms→초 정규화).
- `lib/parse.ts` — LLM 파싱. **Groq `llama-3.3-70b-versatile`(무료)를 REST 호출**(OpenAI 호환), `response_format: json_object`로 JSON 강제. 키 `GROQ_API_KEY`. (Claude→Gemini→Groq 변천, 근거 `docs/DECISIONS.md`.)
- `lib/storage.ts` — localStorage CRUD + 로깅 + 로그 내보내기.
- `lib/store.ts` — React 바인딩(useSyncExternalStore).
- `app/api/parse-recipe`, `app/api/youtube-transcript` — 서버 라우트.
- `app/page.tsx`(홈/아카이브), `app/recipe/[id]/{page,cook,edit}`, `app/new` — 화면(PRD §8).
- `components/` — RecipeCard, YouTubeEmbed, CookingModeCards, CookingModeOverview 등.

## 진행 상황
- **Phase 1~8 코드 전부 작성 완료.** typecheck·build 통과, 전 라우트 200 응답 확인.
- **미검증(브라우저+API 키 필요한 부분):**
  - LLM 파싱 실제 호출 — `GROQ_API_KEY=... npx tsx scripts/test-parse.ts <url> ...`
  - 클라 인터랙션(localStorage 저장/수정, YouTube 임베드 seek, Wake Lock, 스와이프, 클립보드 감지)은 실제 모바일 브라우저 손 검증 필요.
- 구현 매핑: Phase2=`app/page.tsx`+`lib/storage.ts`·`store.ts`, Phase3=`CookingModeCards`+`YouTubeEmbed`+`useWakeLock`, Phase4=`CookingModeOverview`+cook토글, Phase5=`recipe/[id]/page.tsx`+`IngredientChecklist`·`StepOverview`, Phase6=`edit`·`new`, Phase7=`lib/search.ts`, Phase8=`manifest.ts`+`sw.js`+`settings`.

## 스코프 밖 (요청 와도 추가 금지 — PRD §14)
공유, 레시피 비교분석, 음성 명령, 자동 넘김, AI Q&A, 재료 기반 추천, 커머스 연동, 알림 트리거,
인스타 릴스, GIF 자동생성, 사진 첨부, 타 유저 데이터 기반 추천.

## 로깅 이벤트 (PRD §7) — 절대 빠뜨리지 말 것
`save` · `view` · `stepMove` · `startCooking` · `toggleView` · `openEmbed`.
로그 내보내기(카톡/이메일 전달용)는 필수 기능.

# 레시픽 (Recipick) — 개발 컨텍스트

> 매 세션 자동 로드되는 압축 컨텍스트. 문서 지도는 아래 **문서 하네스** 참조.
> **기능을 추가/변경하기 전에 관련 문서로 맥락을 확인할 것.**

## 문서 하네스 (어디를 읽고 어디에 쓰나)
| 문서 | 성격 | 읽을 때 | 쓸 때 |
|------|------|---------|-------|
| `docs/PRD-v5.md` | **동결**된 원본 프롬프트 전문 | 스펙 원문 확인 | ❌ 수정 금지(원본 기록) |
| `docs/HYPOTHESES.md` | 가설 대장(검증 상태의 척추) | 기능 결정 전 항상 | 리서치/실험 유입 시 상태·근거 갱신 |
| `docs/INSIGHTS-LOG.md` | 학습 유입 타임라인(최신순) | 최근 무엇을 배웠나 | **새 학습의 첫 착지점** — 맨 위에 항목 추가 |
| `docs/research/` | 인터뷰·관찰 원자료(파일당 1건) | 근거 추적 | `_TEMPLATE.md` 복사해 새 파일 |
| `docs/experiments/` | 로그 기반 실험(파일당 1건) | 실험 설계·결과 | `_TEMPLATE.md` 복사해 새 파일 |
| `docs/DECISIONS.md` | 기술/제품 결정 로그 | 왜 이렇게 짰나 | 새 결정·뒤집기 시 append |

### 리서치 유입 워크플로 (유저가 인터뷰/실험 결과를 주입하면)
1. `docs/research/` 또는 `docs/experiments/`에 템플릿 복사 → 상세 기록.
2. `docs/HYPOTHESES.md`에서 해당 가설의 **상태·근거·최근 갱신일** 수정 (`[[파일]]` 링크).
3. `docs/INSIGHTS-LOG.md` 맨 위에 "유입→가설 영향→결정/변경→다음" 한 항목 추가.
4. 제품/코드 변경이 확정되면 `docs/DECISIONS.md`에 결정 append.
5. 가설이 뒤집히면 이 파일의 검증 목적 표현도 맞춰 갱신.

## 한 줄 요약
유튜브 레시피 URL → LLM이 자막 파싱 → 단계별 카드로 변환 → 요리용 포맷으로 아카이빙하는 PWA 프로토타입.
목적은 **가설 4가지 실사용 검증**이지 완성도 높은 제품이 아니다. → 로깅이 존재 이유(§16, `docs/PRD-v5.md`).

## 검증 목적 (PRD §5 / 상세·상태는 `docs/HYPOTHESES.md`) — 모든 기능 결정의 기준
1. **H-VIEW** 카드 뷰 vs 전체 뷰 중 유저가 뭘 고르는지 (`toggleView` 로그가 핵심 데이터)
2. **H-EMBED** 임베디드 플레이어가 요리 상황에서 실제로 쓰이는지 (`openEmbed` 로그)
3. **H-RETENTION** 아카이브 재접근율 (`accessCount`, `view` 로그)
4. **H-ACCESS** 접근성 마찰 — 클립보드 감지·검색이 재방문 트리거로 작동하는지

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
- `lib/parse.ts` — LLM 파싱. **Groq `llama-3.3-70b-versatile`(무료)를 REST 호출**(OpenAI 호환), `response_format: json_object`로 JSON 강제. 키 `GROQ_API_KEY`. (Claude→Gemini→Groq 변천, 근거 `docs/DECISIONS.md`.) `parseRecipeFromTranscript`(자막)·`parseRecipeFromText`(붙여넣은 줄글 — 자막 없는 영상 대안) 두 경로, Groq 호출부·`normalize` 공유.
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

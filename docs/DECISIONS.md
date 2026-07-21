# 결정 로그 (Decision Log)

원본 스펙(`docs/PRD-v5.md`)에 없거나, 구현하며 새로 내린 판단을 기록한다.
날짜·결정·이유·대안 순. 나중에 이 결정을 뒤집을 땐 여기에 추가로 남긴다.

---

## 2026-07-18 · 초기 구현

### 파싱 LLM: Groq `llama-3.3-70b-versatile` (무료)
- **변천**: `claude-opus-4-8`(최초) → opus 미접근 → `claude-sonnet-4-6` → Claude **크레딧 부족** → **Gemini 무료 티어** 시도했으나 유저 구글 계정이 기존 GCP 프로젝트에 묶여 **free tier `limit:0`**(새 프로젝트 키로도 동일) → **Groq 무료**로 최종 교체 (2026-07-20).
- **이유**: Groq는 Google Cloud 프로젝트/할당량 얽힘이 없어 카드 없이 확실히 무료. `console.groq.com/keys`에서 키 발급, Vercel 배포 가능, OpenAI 호환 API + `response_format: json_object`로 JSON 강제.
- **구현**: `lib/parse.ts`에서 REST(`api.groq.com/openai/v1/chat/completions`) 직접 호출. JSON 스키마는 시스템 프롬프트에 명시(json_object 모드). SDK 의존성 없음.
- **키**: `GROQ_API_KEY`.
- **트레이드오프**: Llama-3.3-70B는 Claude 대비 스텝 원자화·하이라이트 정밀도가 다소 낮을 수 있음. 무료 rate limit 존재(429 시 재시도).
- **재검토 트리거**: 품질 부족하면 Groq의 상위 모델 또는 (결제 되면) Claude로 복귀. 파싱이 `parseRecipeFromTranscript`로 격리돼 있어 `lib/parse.ts`만 교체하면 됨.
- **주의**: Gemini free tier `limit:0`은 "키가 기존 GCP 프로젝트에 붙어 무료 할당량이 없어서"가 원인. 이 계정에선 새 프로젝트로도 해결 안 됐음 → Gemini 재시도는 시간낭비.

### Tool Use는 `strict: false` + `tool_choice` 강제
- **이유**: `tool_choice: {type:"tool"}`만으로 안정적 JSON 확보. strict를 켜면 optional 필드(startTime 등)를 다루기 번거로움.
- **방어적 파싱**(`normalize`)으로 누락/이상값 흡수.

### 상태관리: Zustand 대신 경량 커스텀 store
- **이유**: localStorage 한 소스만 다루므로 `useSyncExternalStore` + 구독 패턴으로 충분. 의존성 최소화.
- **재검토 트리거**: 상태 공유가 복잡해지면 Zustand 도입.

### 폼: React Hook Form 미도입 (직접 작성/수정 폼은 useState)
- **이유**: 폼이 단순(동적 스텝 추가 정도). RHF 도입 이득 대비 오버헤드.

### 애니메이션: Framer Motion 미도입 (스와이프는 네이티브 터치/포인터 이벤트)
- **이유**: 의존성 줄이고 번들 가볍게. 스와이프는 pointer 이벤트로 충분.
- **재검토 트리거**: 전환 애니메이션 요구가 커지면 도입.

### PWA 서비스워커: next-pwa 대신 최소 커스텀 SW
- **이유**: next-pwa는 Next 15와 궁합 이슈가 잦음. 오프라인 앱쉘 캐싱 수준의 최소 SW로 충분(이번 스코프에 오프라인 요구 없음).

### 서버 캐시는 프로세스 인메모리 Map
- **이유**: 프로토타입. 서버리스에서 콜드스타트 시 사라지지만, 클라 localStorage 캐시가 주 방어선. 비용 절감 목적엔 충분.

### 텍스트 붙여넣기 파싱 경로 (자막 없는 영상 대안 + 줄글 레시피 입력) — 2026-07-20
- **문제**: 유튜브 자막이 없으면 `NoTranscriptError`로 저장 불가. 그러나 레시피 글은 설명란·고정 댓글·블로그·손메모에 이미 존재.
- **결정**: 자유 형식 텍스트를 LLM이 구조화하는 경로 추가. 자막 파서(`parseRecipeFromTranscript`)와 별도 프롬프트의 `parseRecipeFromText`를 두되 Groq 호출부(`callGroq`)·`normalize`는 공유.
- **API**: `POST /api/parse-recipe`에 `text` 모드 추가(`{ text, title?, url? }` → `{ ok, recipe, sourceType:"text" }`). URL 모드는 그대로. 예외 매핑은 `errorResponse`로 공통화.
- **저장**: `createRecipeFromText`는 `sourceType:"manual"`로 저장하되 태그 보존, `save` 로그 `metadata.sourceType:"text"`로 경로 구분(H-ACCESS 관찰용).
- **화면**: `/new`를 `붙여넣기(기본) | 직접 입력` 2모드로 재구성(`Suspense`+`useSearchParams`). 홈에서 자막 실패(`no_transcript`) 시 에러로 막지 않고 `/new?mode=paste&url=…` 붙여넣기 경로로 유도.
- **UX writing**: `저장`→**`담기`**(아카이브 담기 은유), AI 정리 액션은 **`레시피로 정리하기`**, 수정은 **`수정 완료`**로 통일. CategoryModal·클립보드 배너도 `담기`.
- **로딩**: `ParsingIndicator`(스피너+단계별 순차 문구) — URL/텍스트 각각 단계 문구. 버튼 내부에도 `Spinner` 노출.
- **스코프 확인**: PRD §14 스코프아웃(공유·비교·음성·AI Q&A 등)에 저촉 없음. 오히려 저장 진입 마찰 축소로 H-ACCESS 검증 표면을 넓힘.
- **트레이드오프**: 텍스트엔 타임스탬프가 없어 임베드 seek 불가 → `manual` 취급이 자연스러움. 순서 흐트러진 글은 LLM이 상식적으로 재배열(오파싱 여지 → 수정 화면으로 보정).

### 하단 탭바 도입 + 홈/아카이빙 분리 — 2026-07-20
- **결정**: 앱 최상위 내비를 하단 3탭으로 구성 — **홈**(레시피 변환+검색) · **레시피 추가**(`/new`) · **아카이빙**(`/archive`).
- **분리**: 기존 홈이 변환·검색·전체목록·필터를 모두 안고 있었음 → 전체 목록/카테고리·매체 필터·정렬은 `/archive`로 이관. 홈은 변환(URL/클립보드/자막없음 대안)과 검색(+최근 미리보기)만.
- **탭바 노출 범위**: 자체 하단 CTA가 있는 화면(`/new`, cook, edit)에는 탭바를 렌더하지 않고 홈·아카이빙에서만 노출(CTA 충돌 방지). `추가` 탭은 `/new`로 push되는 포커스 화면.
- **관찰 함의**: 홈 검색 vs 아카이빙 브라우징 어느 쪽이 재방문·재조회를 유발하는지 분리 관찰 가능(H-ACCESS/H-RETENTION). 두 목록 진입 모두 `view` 로그로 포착.

### 스텝 타이머 (레시피 시간 기반 프리셋 + 사용자 조정) — 2026-07-21
- **결정**: 쿠킹 모드 카드 뷰에서 시간이 필요한 스텝에 카운트다운 타이머를 노출. 레시피에 적힌 시간(스텝의 `time` 하이라이트 → 없으면 지시문 텍스트)에서 초를 추론해 기본값으로 프리셋하고, 사용자가 ±10초/±1분으로 조정 가능.
- **시간 파싱**(`lib/timers.ts::parseDurationToSeconds`): "5분"·"1분 30초"·"1시간"·"30초"·"약 10분" 등 합산 파싱. "2분의 1"(분수)은 `분(?!의)`로 제외. `stepTimerSeconds`는 LLM이 분류한 `time` 하이라이트를 우선 신뢰하고, 없을 때만 지시문 스캔(오탐 최소화).
- **세션 매니저**(`lib/timers.ts`): 타이머 상태를 세션 메모리(Map)에만 두고 localStorage 저장 안 함. 단일 인터벌(250ms)이 `endAt` 타임스탬프 기준으로 감산 → 스텝을 넘나들거나 컴포넌트가 언마운트돼도 상태 보존, 시간이 되면 한 번만 알림. storage.ts와 동일한 구독 패턴(`useSyncExternalStore`).
- **알림**: 인앱 한정 — Web Audio 삐 3회 + `navigator.vibrate`. 오디오는 시작 버튼(사용자 제스처) 시점에 활성화. **시스템 푸시 알림은 쓰지 않음** → PRD §14 스코프아웃의 "알림 트리거"(리텐션 유도 푸시)와 구분.
- **스코프 정합**: PRD의 "강제 금지: 자동 넘김·강제 대기 없음, 유저 페이스 존중"과 일치 — 타이머는 사용자가 직접 `시작`을 눌러야 하고, 완료돼도 스텝을 자동으로 넘기지 않는다(알림만).
- **배치**: 카드 뷰(`CookingModeCards`)에만 배치. 전체 뷰(`CookingModeOverview`)는 스텝이 `<button>` 내비 항목이라 중첩 인터랙션을 피하려 타이머 미배치 — 탭하면 해당 스텝 카드로 이동해 거기서 타이머 사용.

### 배포 환경 자막 추출 — Supadata(프록시 내장 서드파티 API) 경유 — 2026-07-21
- **문제**: `youtube-transcript`는 youtube.com을 직접 스크래핑하는데, YouTube가 데이터센터/클라우드 IP(Vercel 등)의 자막 요청을 봇으로 보고 차단 → 로컬(가정 IP)은 되지만 배포에선 `no_transcript`(422). 배포 API로 재현·확인함.
- **비해결 확인**: (1) 배포처 변경 → 모든 클라우드 IP 동일하게 차단되므로 무의미. (2) 공식 YouTube Data API `captions.download` → 채널 소유자 본인 영상만 가능, 남의 레시피 영상은 대상 아님. → 프록시 경유가 유일한 길.
- **결정**: 프록시를 내장한 서드파티 자막 API(**Supadata**, 무료 월 100건) 경유. `lib/transcript.ts`에 공급원 폴백 체인 구성. 키는 서버 환경변수 `SUPADATA_API_KEY`(클라 노출 금지, Groq 키와 동일 규칙).
- **크레딧 절약 분기**: `process.env.VERCEL`로 환경 판별. 로컬은 무료 직접 스크래핑 우선→Supadata 폴백, 클라우드는 Supadata 우선→스크래핑 최후 폴백. 키 없으면 스크래핑만(로컬 개발 무변경).
- **관찰 함의**: 자막 자동추출이 H-ACCESS(재방문 마찰) 검증에 실제로 중요한지 확인되기 전까지 최소 비용(무료 티어) 유지. 중요성 확인 시 유료 플랜/음성전사(Whisper) 승급 검토. 그전까지 자막 실패 대안은 붙여넣기 경로.

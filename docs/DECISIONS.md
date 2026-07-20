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

# 레시픽 (Recipick)

유튜브 레시피 URL을 입력하면 LLM이 자막을 파싱해 **단계별 요리 카드**로 변환하고, 저장 시점부터 **요리용 포맷으로 아카이빙**하는 서비스입니다.

요리 유튜브를 볼 때마다 겪는 "저장은 캡처·종이 메모·블로그로 흩어지고, 막상 요리할 땐 영상을 앞뒤로 돌려봐야 하는" 문제를 해결하는 것이 목표입니다. 12명 유저 인터뷰(4회 반복)를 거쳐 만든 실동작 프로토타입입니다.

> 이 프로젝트는 **가설 검증용 프로토타입**입니다. 완성도 높은 제품이 아니라, 실사용 관찰로 4가지 가설을 검증하는 것이 존재 이유입니다. 그래서 **사용 로그 수집**이 핵심 기능입니다.

---

## 검증하려는 것

| # | 가설 | 관찰 방법 |
|---|---|---|
| 1 | 요리 중 **카드 뷰 vs 전체 뷰** 중 뭘 선호하는가 | `toggleView` 로그 |
| 2 | **임베디드 플레이어**가 실제 요리 상황에서 쓰이는가 | `openEmbed` 로그 |
| 3 | 저장한 레시피의 **재접근율**(재방문) | `accessCount`, `view` 로그 |
| 4 | **클립보드 감지·검색**이 재방문 트리거로 작동하는가 | 진입 경로 로그 |

---

## 주요 기능

- **URL 저장**: 유튜브 레시피 URL → 자막 추출 → LLM(Groq)이 재료·단계·태그로 구조화 → 아카이브에 저장
- **클립보드 자동 감지**: 앱 진입 시 클립보드에 유튜브 링크가 있으면 저장 제안
- **아카이브 홈**: 통합 검색(제목·재료·태그), 재료 **부분 매칭**("면" → 파스타면·우동면 등), 카테고리 탭, 매체/정렬 필터
- **재료 준비 화면**: 기본/특수 재료 분리 체크리스트, 요리 순서 미리보기, 크리에이터 출처 표시
- **쿠킹 모드 (핵심 실험)**: 두 가지 뷰를 대등하게 제공하고 유저 선택을 로깅
  - **카드 모드**: 스텝별 카드, 좌우 스와이프, 재료/계량/시간/화력 하이라이팅, 스텝 이동 시 영상 자동 seek
  - **전체 모드**: 스크롤 나열 + 상단 고정 임베드 + 재생 중인 스텝 자동 하이라이트
  - Wake Lock으로 요리 중 화면 꺼짐 방지
- **수정 / 직접 작성**: 인라인 수정, 스텝별 메모(요리 후 본인 변형 기록), 손으로 레시피 작성
- **PWA**: "홈 화면에 추가"로 앱처럼 실행, 서비스 워커
- **로그 내보내기**: 수집된 사용 로그를 복사/파일로 받아 전달 (실사용 검증용)

---

## 기술 스택

- **Next.js 15** (App Router) · **TypeScript** · **Tailwind CSS**
- **Groq API** (무료) — OpenAI 호환 · `response_format: json_object`로 자막을 구조화된 JSON으로 강제 파싱 (모델 `llama-3.3-70b-versatile`)
- **youtube-transcript** — 자막 추출 (별도 키 불필요)
- **localStorage** — 데이터 저장 (백엔드 없음, 프로토타입)
- **Vercel** — 배포 (main push 시 자동 배포)

왜 PWA인가, 왜 Serverless인가 등 결정 근거는 [`docs/PRD-v5.md`](docs/PRD-v5.md), [`docs/DECISIONS.md`](docs/DECISIONS.md) 참고.

---

## 프로젝트 구조

```
├── app/
│   ├── page.tsx                    # 홈 (아카이브)
│   ├── recipe/[id]/page.tsx        # 재료 준비
│   ├── recipe/[id]/cook/page.tsx   # 쿠킹 모드 (카드/전체 토글)
│   ├── recipe/[id]/edit/page.tsx   # 수정
│   ├── new/page.tsx                # 직접 작성
│   ├── settings/page.tsx           # 로그 내보내기 · 저작권
│   ├── manifest.ts                 # PWA 매니페스트
│   └── api/
│       ├── parse-recipe/route.ts       # 자막 → Groq → 구조화 JSON
│       └── youtube-transcript/route.ts # 자막 추출
├── components/                     # RecipeCard, YouTubeEmbed, CookingMode*, ...
├── lib/
│   ├── types.ts        # 데이터 스키마 (단일 진실 소스)
│   ├── youtube.ts      # videoId 추출 등
│   ├── transcript.ts   # 자막 추출·정규화
│   ├── parse.ts        # Groq 파싱 (json_object 모드로 JSON 강제)
│   ├── storage.ts      # localStorage CRUD + 로깅
│   ├── store.ts        # React 바인딩 (useSyncExternalStore)
│   └── search.ts       # 검색·필터·정렬
├── scripts/test-parse.ts   # 파싱 파이프라인 검증 스크립트
├── CLAUDE.md               # 개발 컨텍스트 (요약)
└── docs/                   # PRD 원본 · 결정 로그
```

---

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경변수

`.env.local.example`을 `.env.local`로 복사하고 Groq API 키를 넣습니다.

```bash
cp .env.local.example .env.local
```

```
GROQ_API_KEY=...
```

> 키는 [Groq Console](https://console.groq.com/keys)에서 **무료로**(신용카드 불필요) 발급. 자막 추출은 별도 키가 필요 없습니다.

### 3. 개발 서버

```bash
npm run dev
```

`http://localhost:3000` 접속. 모바일 우선 UI이므로 폰 브라우저(또는 개발자도구 모바일 뷰)로 확인하는 것을 권장합니다.

### 4. 파싱 파이프라인만 검증 (UI 없이)

자막 있는 요리 영상 몇 개로 파싱 성공률·정확도를 먼저 확인할 수 있습니다.

```bash
GROQ_API_KEY=... npx tsx scripts/test-parse.ts "<youtube-url-1>" "<youtube-url-2>"
```

각 영상의 제목·재료 수·스텝 수·태그·타임스탬프 매핑률과 전체 성공률(%)이 출력됩니다.

---

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run typecheck` | 타입 검사 |
| `npm run parse:test` | 파싱 검증 스크립트 (URL 인자 필요) |

---

## 배포 (Vercel)

1. 저장소를 Vercel에 연결
2. 환경변수 `GROQ_API_KEY` 추가
3. main 브랜치 push 시 자동 배포

인터뷰 참가자에게는 배포 URL만 공유하면 됩니다(진입 장벽 최소화가 PWA를 택한 이유).

---

## 개발 진행 상황

Phase 1~8 코드가 모두 작성되어 있고 빌드·타입 검사를 통과합니다.

- **검증 완료**: 빌드, 타입, 전 라우트 응답, 자막 추출(실제 유튜브)
- **미검증(직접 확인 필요)**:
  - LLM 실제 파싱 호출(Groq) → API 키로 `parse:test` 실행
  - 클라이언트 인터랙션(localStorage 저장·수정, 임베드 seek, Wake Lock, 스와이프, 클립보드 감지) → 실제 모바일 브라우저 확인

---

## 스코프에서 제외한 것

다음 기능은 이번 프로토타입에서 의도적으로 배제했습니다(요청이 있어도 추가하지 않음).

공유 · 여러 레시피 비교 분석 · 음성 명령 · 자동 넘김 · AI 질의응답 · 재료 기반 추천 · 커머스 연동 · 알림 트리거 · 인스타 릴스 · GIF 자동 생성 · 사진 첨부

---

## 저작권

레시픽은 원 크리에이터의 유튜브 영상을 **참고 자료로 연결**하며, 모든 레시피에 출처(채널명·원본 링크)를 표기합니다. 영상 저작권은 각 크리에이터에게 있습니다. 개인적인 요리 참고 용도의 프로토타입입니다.

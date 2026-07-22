// 자막 → 구조화된 레시피 파싱. Groq(무료, OpenAI 호환 API)를 REST로 호출.
// JSON 모드(response_format)로 형식을 강제한다 (Claude Tool Use와 동일한 목적).
import type { ParsedRecipe, TranscriptSegment } from "./types";
import { assignStepTimestamps } from "./timestamps";

const MODEL = "llama-3.3-70b-versatile";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// 두 경로(자막·자유텍스트)가 공유하는 파싱 규칙. 프롬프트가 서로 어긋나지 않도록 한 곳에 둔다.
// v6: 6인 인터뷰 지적(과분할·재료 누락·오파싱·계량·인분)을 반영해 규칙 강화. [[2026-07-22-interviews-v5-6people]]
const COMMON_RULES = `[재료 규칙]
- 입력 전체에서 언급된 재료를 하나도 빠뜨리지 마세요. 특히 조리 스텝에 등장하는 재료는 반드시 재료 목록에도 포함되어야 합니다(누락 금지).
- 기본 재료(물·소금·후추·식용유·설탕·간장 등 상비 조미료)는 isBasic=true, 따로 장을 봐야 하는 재료는 isBasic=false.
- 계량은 표준 단위로 정규화: 큰술·작은술·컵·g·ml·개·모·장 등. "한 스푼"→"1큰술", "두 컵"→"2컵". 계량 정보가 없으면 amount는 빈 문자열로 두되, 재료 자체는 절대 생략하지 마세요.

[인분 규칙]
- 레시피가 몇 인분 기준인지 숫자로 servings에 넣으세요(예: 2). "2~3인분"이면 대표값 하나(예: 2)로. 어디에도 명시가 없으면 servings를 생략하세요(추측 금지).

[스텝 규칙]
- 한 스텝 = 실제 요리하는 사람이 한 호흡에 수행하는 하나의 의미 있는 조리 동작. 예: "양파를 넣고 갈색이 될 때까지 볶는다"는 한 스텝입니다.
- 과도하게 쪼개지 마세요: "넣는다"와 "젓는다"처럼 연속된 자잘한 동작을 억지로 분리하지 말고 자연스럽게 하나로 묶으세요. 반대로 서로 다른 재료 손질·조리 단계는 섞지 마세요.
- 각 스텝의 1줄 요약(summary)을 오버뷰용으로 제공.
- 재료명/계량/시간/화력 정보를 highlights로 분류 (type: ingredient|amount|time|heat). 없으면 빈 배열.

[정확성 규칙]
- 입력에 없는 재료·단계·수치를 지어내지 마세요.
- 단, 자막은 음성 인식이라 요리 용어가 잘못 표기될 수 있습니다(예: "굴소스"가 "불소스"로, "다진 마늘"이 "다진 마을"로). 문맥상 명백한 표준 요리 용어로 교정하세요. 확신이 없으면 원문을 유지하세요.`;

const JSON_SHAPE = `반드시 아래 JSON 형식으로만 응답하세요. 코드블록이나 설명 없이 순수 JSON 객체만 출력합니다:
{
  "title": "요리명",
  "servings": 2,
  "tags": ["태그1", "태그2"],
  "ingredients": [{ "name": "재료명", "amount": "계량(없으면 빈 문자열)", "isBasic": false }],
  "steps": [
    {
      "order": 1,
      "text": "조리 지시",
      "summary": "1줄 요약",
      "startTime": 12,
      "highlights": [{ "type": "ingredient", "value": "대파" }]
    }
  ]
}
title은 실제 요리명만(영상 제목의 어그로·수식어 제외). servings를 모르면 생략. tags는 요리 특성 3~7개(예: "면 요리", "국물 요리", "매운맛", "한식").`;

const SYSTEM_PROMPT = `당신은 요리 유튜브 영상의 자막을 분석하여 구조화된 레시피로 변환하는 전문가입니다.
입력된 자막(음성 인식 결과)을 분석하여 제목·인분·재료·조리 스텝·태그를 추출하세요.

${COMMON_RULES}
- 각 스텝의 startTime(초)은 **반드시 자막의 [분:초] 표시에서** 가져오세요. 그 동작이 자막에 나오는 시점의 [분:초]를 초로 환산해 **모든 스텝에** 넣습니다. 설명란은 재료·계량·인분 보완용일 뿐 스텝 타이밍의 근거가 아닙니다. 자막에서 도저히 시점을 못 찾는 스텝만 생략하세요.

${JSON_SHAPE}`;

// 자유 형식 텍스트(블로그·설명란·손메모)를 파싱하는 프롬프트. 자막용과 달리 타임스탬프가 없다.
const TEXT_SYSTEM_PROMPT = `당신은 사용자가 붙여넣은 자유 형식의 레시피 글을 구조화된 레시피로 변환하는 전문가입니다.
입력은 블로그 글, 영상 설명란, 고정 댓글, 손으로 적은 메모 등 어떤 형식이든 될 수 있습니다. 재료와 조리법이 뒤섞여 있거나 순서가 흐트러져 있을 수 있습니다.
제목·인분·재료·조리 스텝·태그를 추출하세요. 제목이 명시되지 않았으면 대표 재료·조리법을 근거로 자연스러운 제목을 생성하세요.

${COMMON_RULES}
- 순서가 불분명하면 상식적인 조리 순서로 재배열하세요. 이것은 영상이 아니므로 startTime은 없습니다.

${JSON_SHAPE}`;

export class ParseFailedError extends Error {
  constructor(message = "레시피 파싱에 실패했습니다") {
    super(message);
    this.name = "ParseFailedError";
  }
}

export class LlmConfigError extends Error {
  constructor(message = "서버에 Groq API 키가 설정되지 않았습니다") {
    super(message);
    this.name = "LlmConfigError";
  }
}

/**
 * 영상이 길어 자막+응답 토큰이 모델의 분당 토큰 한도(TPM)를 한 번에 넘긴 경우(HTTP 413).
 * 재시도해도 동일하게 실패하므로 429(RateLimitError)와 구분한다.
 */
export class RecipeTooLongError extends Error {
  constructor(message = "영상이 너무 길어 한 번에 정리하기 어려워요") {
    super(message);
    this.name = "RecipeTooLongError";
  }
}

/** 순간적으로 요청이 몰려 rate limit에 걸린 경우(HTTP 429). 잠시 후 재시도하면 대개 풀린다. */
export class RateLimitError extends Error {
  constructor(message = "지금 요청이 몰려 있어요") {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function parseRecipeFromTranscript(params: {
  transcript: string;
  videoTitle?: string;
  channelName?: string;
  description?: string; // 영상 설명란 — 재료·계량 보완 소스 (있으면 자막과 함께 투입)
  segments?: TranscriptSegment[]; // 원본 자막 세그먼트 — LLM이 놓친 startTime을 텍스트 매칭으로 복구
}): Promise<ParsedRecipe> {
  const desc = params.description?.trim();
  const userContent = [
    params.videoTitle ? `영상 제목: ${params.videoTitle}` : null,
    params.channelName ? `채널명: ${params.channelName}` : null,
    desc
      ? `\n[영상 설명란] — 재료·계량·인분이 정리돼 있을 수 있으니 자막보다 우선 신뢰하되, 프로모션·링크·인사말은 무시하세요:\n${desc}`
      : null,
    "",
    "[자막] — 조리 순서와 타임스탬프의 근거:",
    params.transcript,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const json = await callGroq(SYSTEM_PROMPT, userContent);
  const parsed = normalize(json, params.channelName);
  // LLM이 일부 스텝의 startTime을 누락해도 자막과 매칭해 복구(카드-타임라인 연동 매핑률↑).
  if (params.segments && params.segments.length > 0) {
    parsed.steps = assignStepTimestamps(parsed.steps, params.segments);
  }
  return parsed;
}

/** 자유 형식 텍스트(붙여넣은 레시피 글)를 파싱한다. 자막 없는 영상의 대안 경로 겸 직접 입력 보조. */
export async function parseRecipeFromText(params: {
  text: string;
  title?: string;
  sourceName?: string;
}): Promise<ParsedRecipe> {
  const userContent = [
    params.title ? `사용자가 지정한 제목(참고): ${params.title}` : null,
    params.sourceName ? `출처(참고): ${params.sourceName}` : null,
    "",
    "레시피 글:",
    params.text,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return normalize(await callGroq(TEXT_SYSTEM_PROMPT, userContent));
}

/** Groq(OpenAI 호환) 호출 공통부: 키 확인 → JSON 모드 요청 → 재시도 → 파싱까지. */
async function callGroq(systemPrompt: string, userContent: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new LlmConfigError();

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    // 레시피 JSON은 이 정도면 충분하다. 예약 출력 토큰이 클수록 TPM 한도(12k)를 빨리 소진해
    // 조금만 긴 영상도 413을 유발하므로, 자막이 들어갈 여유를 남기려 낮춰 잡는다.
    max_tokens: 4000,
  };

  const call = () =>
    fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

  let res = await call();
  if (!res.ok) {
    // 413(Request too large): 단일 요청이 분당 토큰 한도를 초과 — 재시도해도 실패하므로 즉시 안내.
    if (res.status === 413) throw new RecipeTooLongError();
    // 429(rate limit)·5xx(일시 오류): 한 번만 재시도.
    if (res.status === 429 || res.status >= 500) res = await call();
    if (!res.ok) {
      if (res.status === 429) throw new RateLimitError();
      const detail = await safeErrorMessage(res);
      throw new ParseFailedError(`Groq 오류 ${res.status}: ${detail}`);
    }
  }

  const data = (await res.json()) as GroqResponse;
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new ParseFailedError("응답이 비어있음");

  try {
    return JSON.parse(text);
  } catch {
    throw new ParseFailedError("JSON 파싱 실패");
  }
}

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as GroqResponse;
    return j.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

/** 응답을 ParsedRecipe로 정규화(방어적 파싱). */
function normalize(input: unknown, channelName?: string): ParsedRecipe {
  const raw = input as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) throw new ParseFailedError();

  const servings = parseServings(raw.servings);

  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t): t is string => typeof t === "string")
    : [];

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .map((i) => {
          const ing = i as Record<string, unknown>;
          return {
            name: String(ing.name ?? "").trim(),
            amount: String(ing.amount ?? "").trim(),
            isBasic: Boolean(ing.isBasic),
          };
        })
        .filter((i) => i.name)
    : [];

  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map((s, idx) => {
          const st = s as Record<string, unknown>;
          const highlights = Array.isArray(st.highlights)
            ? st.highlights
                .map((h) => {
                  const hl = h as Record<string, unknown>;
                  return { type: hl.type, value: String(hl.value ?? "") };
                })
                .filter(
                  (h): h is { type: "ingredient" | "amount" | "time" | "heat"; value: string } =>
                    ["ingredient", "amount", "time", "heat"].includes(h.type as string) &&
                    h.value.length > 0,
                )
            : [];
          return {
            order: typeof st.order === "number" ? st.order : idx + 1,
            text: String(st.text ?? "").trim(),
            summary: String(st.summary ?? "").trim(),
            memo: "",
            startTime: typeof st.startTime === "number" ? st.startTime : undefined,
            highlights,
          };
        })
        .filter((s) => s.text)
    : [];

  if (steps.length === 0) throw new ParseFailedError();

  return { title, channelName, servings, tags, ingredients, steps };
}

/** servings를 양수 정수로 정규화. 숫자/문자열("2인분", "2~3") 모두 허용, 이상값은 undefined. */
function parseServings(raw: unknown): number | undefined {
  let n: number | undefined;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") {
    const m = raw.match(/\d+/); // "2인분", "2~3인분" → 첫 숫자
    if (m) n = Number(m[0]);
  }
  if (n === undefined || !Number.isFinite(n)) return undefined;
  n = Math.round(n);
  return n >= 1 && n <= 99 ? n : undefined;
}

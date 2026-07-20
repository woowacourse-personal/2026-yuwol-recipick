// 자막 → 구조화된 레시피 파싱. Groq(무료, OpenAI 호환 API)를 REST로 호출.
// JSON 모드(response_format)로 형식을 강제한다 (Claude Tool Use와 동일한 목적).
import type { ParsedRecipe } from "./types";

const MODEL = "llama-3.3-70b-versatile";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `당신은 요리 유튜브 영상의 자막을 분석하여 구조화된 레시피로 변환하는 전문가입니다.

입력된 자막을 분석하여 다음을 추출하세요:

1. 레시피 제목: 영상 제목/자막에서 실제 요리명만 추출
2. 재료 목록: 각 재료의 이름과 계량. 기본 재료(물, 소금, 후추, 식용유, 설탕 등)와 특수 재료를 isBasic으로 구분
3. 조리 스텝:
   - 각 스텝은 "재료를 가지고 무엇을 한다" 형태로 원자적으로 작성 (여러 동작을 한 스텝에 섞지 말 것)
   - 각 스텝에 자막상의 타임스탬프(초)를 startTime으로 매핑
   - 각 스텝의 1줄 요약(summary)을 오버뷰용으로 제공
   - 재료명/계량/시간/화력 정보를 highlights로 분류 (type: ingredient|amount|time|heat)
4. 태그: 요리 특성 태그 3~7개 (예: "면 요리", "국물 요리", "매운맛", "한식")

자막에 없는 내용을 지어내지 마세요.

반드시 아래 JSON 형식으로만 응답하세요. 코드블록이나 설명 없이 순수 JSON 객체만 출력합니다:
{
  "title": "요리명",
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
startTime을 모르면 생략하세요. highlights가 없으면 빈 배열로 두세요.`;

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

export async function parseRecipeFromTranscript(params: {
  transcript: string;
  videoTitle?: string;
  channelName?: string;
}): Promise<ParsedRecipe> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new LlmConfigError();

  const userContent = [
    params.videoTitle ? `영상 제목: ${params.videoTitle}` : null,
    params.channelName ? `채널명: ${params.channelName}` : null,
    "",
    "자막:",
    params.transcript,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 8000,
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
    if (res.status === 429 || res.status >= 500) res = await call();
    if (!res.ok) {
      const detail = await safeErrorMessage(res);
      throw new ParseFailedError(`Groq 오류 ${res.status}: ${detail}`);
    }
  }

  const data = (await res.json()) as GroqResponse;
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new ParseFailedError("응답이 비어있음");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ParseFailedError("JSON 파싱 실패");
  }

  return normalize(parsed, params.channelName);
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

  return { title, channelName, tags, ingredients, steps };
}

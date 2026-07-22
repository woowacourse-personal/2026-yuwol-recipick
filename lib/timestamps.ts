// 스텝 타임스탬프 후처리 — LLM이 startTime을 빠뜨린 스텝을 자막 세그먼트와 텍스트 매칭해 복구한다.
// 카드-타임라인 연동(H-EMBED)의 근본 품질: LLM이 설명란에 기대 스텝을 만들면 자막 타임스탬프를
// 누락하는 경향이 있어(0/10 사례), 결정론적 폴백으로 매핑률을 끌어올린다. [[HYPOTHESES]] H-EMBED
import type { Step, TranscriptSegment } from "./types";

/** 한글 2음절+ / 영숫자 2자+ 토큰. 조사·단음절은 버려 잡음을 줄인다. */
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[가-힣]{2,}|[a-z0-9]{2,}/g) ?? [];
}

/** 스텝의 검색 토큰: 지시문 + 하이라이트(재료/계량/화력/시간은 강한 신호라 가중). */
function stepTokens(step: Step): Map<string, number> {
  const weights = new Map<string, number>();
  for (const t of tokenize(step.text)) weights.set(t, Math.max(weights.get(t) ?? 0, 1));
  for (const h of step.highlights) {
    for (const t of tokenize(h.value)) weights.set(t, 2); // 하이라이트 토큰은 가중 2
  }
  return weights;
}

/**
 * startTime이 없는 스텝을 자막 세그먼트와 매칭해 채운다.
 * - 스텝 순서를 존중해 시간은 비감소(monotonic)로만 진행(뒤로 점프 금지).
 * - 토큰 겹침 점수가 0이면 비워둔다(렌더 시 effectiveStartTime이 앞 값으로 이어받음).
 * 세그먼트가 없으면 원본을 그대로 반환.
 */
export function assignStepTimestamps(steps: Step[], segments: TranscriptSegment[]): Step[] {
  if (segments.length === 0) return steps;

  // 세그먼트 토큰 집합을 미리 계산(시간순 가정 — fetchTranscript가 시간순 반환).
  const segTokens = segments.map((s) => new Set(tokenize(s.text)));

  let pointer = 0; // 이 인덱스 이전 세그먼트는 이미 지난 스텝이 차지 → 비감소 보장
  return steps.map((step) => {
    // LLM이 준 유효한 startTime이 비감소면 그대로 신뢰하고 포인터만 전진.
    if (step.startTime !== undefined) {
      while (pointer < segments.length - 1 && segments[pointer + 1].startSeconds <= step.startTime!) {
        pointer++;
      }
      return step;
    }

    const wanted = stepTokens(step);
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = pointer; i < segments.length; i++) {
      let score = 0;
      for (const [tok, w] of wanted) if (segTokens[i].has(tok)) score += w;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) return step; // 겹치는 토큰 없음 → 비워둠(렌더 폴백에 위임)
    pointer = bestIdx;
    return { ...step, startTime: segments[bestIdx].startSeconds };
  });
}

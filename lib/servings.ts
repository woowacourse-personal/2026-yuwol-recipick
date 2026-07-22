// 인분 조정 — 재료 계량(amount 문자열)을 배수로 스케일링한다 (벤지 요청). [[2026-07-22-interviews-v5-6people]]
// amount는 자유 텍스트("200g", "2큰술", "1/2개", "2~3개", "약간")라 숫자 토큰만 골라 배수를 곱한다.
// 숫자가 없는 표현("약간", "적당량")은 그대로 둔다.

// 분수(1/2), 범위·소수·정수를 각각 하나의 숫자 토큰으로 매칭.
const NUM_TOKEN = /(\d+)\s*\/\s*(\d+)|(\d+(?:\.\d+)?)/g;

/** 소수를 보기 좋게 정리: 정수면 정수, 아니면 최대 2자리 반올림 후 뒤 0 제거. */
function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(/\.?0+$/, "");
}

/**
 * amount 문자열의 숫자들을 factor배로 조정한다.
 * factor가 1이거나 유효하지 않으면 원본을 그대로 반환.
 */
export function scaleAmount(amount: string, factor: number): string {
  if (!amount || !Number.isFinite(factor) || factor === 1 || factor <= 0) return amount;

  return amount.replace(NUM_TOKEN, (match, fracNum, fracDen, plain) => {
    if (fracNum !== undefined && fracDen !== undefined) {
      const denom = Number(fracDen);
      if (!denom) return match;
      const value = (Number(fracNum) / denom) * factor;
      return formatNumber(value);
    }
    if (plain !== undefined) {
      return formatNumber(Number(plain) * factor);
    }
    return match;
  });
}

/** 조정 대상 인분 후보 (기준 인분을 포함한 합리적 범위). */
export function servingOptions(base: number): number[] {
  const set = new Set<number>([1, 2, 3, 4, 6, base]);
  return [...set].filter((n) => n >= 1 && n <= 12).sort((a, b) => a - b);
}

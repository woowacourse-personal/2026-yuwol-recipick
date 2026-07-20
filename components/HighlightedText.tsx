// 스텝 텍스트 안의 재료/계량/시간/화력 키워드를 색으로 하이라이트.
import type { Highlight, HighlightType } from "@/lib/types";

const COLOR: Record<HighlightType, string> = {
  ingredient: "bg-amber-100 text-amber-900",
  amount: "bg-sky-100 text-sky-900",
  time: "bg-emerald-100 text-emerald-900",
  heat: "bg-rose-100 text-rose-900",
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightedText({
  text,
  highlights,
}: {
  text: string;
  highlights: Highlight[];
}) {
  if (!highlights || highlights.length === 0) return <>{text}</>;

  // 값 → 타입 매핑 (긴 값 우선으로 부분 겹침 방지)
  const byValue = new Map<string, HighlightType>();
  for (const h of highlights) {
    if (h.value && !byValue.has(h.value)) byValue.set(h.value, h.type);
  }
  const values = [...byValue.keys()].sort((a, b) => b.length - a.length);
  if (values.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${values.map(escapeRegExp).join("|")})`, "g");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const type = byValue.get(part);
        return type ? (
          <mark key={i} className={`rounded px-1 ${COLOR[type]}`}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

/**
 * Phase 1 파이프라인 검증 스크립트 (UI 없이).
 *
 * 사용법:
 *   GROQ_API_KEY=... npx tsx scripts/test-parse.ts <url1> <url2> ...
 *
 * URL을 넘기지 않으면 DEFAULT_URLS를 사용한다.
 * 자막 있는 요리 영상 80% 이상에서 사용 가능한 결과가 목표 (§15).
 */
import { extractVideoId } from "../lib/youtube";
import { fetchTranscript, transcriptToPrompt } from "../lib/transcript";
import { parseRecipeFromTranscript } from "../lib/parse";

const DEFAULT_URLS: string[] = [
  // 여기에 자막 있는 요리 유튜브 영상 URL 10개 정도를 넣어 테스트한다.
];

async function main() {
  const urls = process.argv.slice(2);
  const targets = urls.length > 0 ? urls : DEFAULT_URLS;

  if (targets.length === 0) {
    console.error("URL을 인자로 넘기세요: npx tsx scripts/test-parse.ts <youtube-url> ...");
    process.exit(1);
  }

  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY 환경변수가 필요합니다.");
    process.exit(1);
  }

  let success = 0;
  for (const url of targets) {
    const videoId = extractVideoId(url);
    console.log(`\n=== ${url}`);
    if (!videoId) {
      console.log("  ✗ 유튜브 URL 아님");
      continue;
    }
    try {
      const t0 = Date.now();
      const segments = await fetchTranscript(videoId);
      const recipe = await parseRecipeFromTranscript({
        transcript: transcriptToPrompt(segments),
      });
      const ms = Date.now() - t0;
      console.log(`  ✓ ${recipe.title}`);
      console.log(`    재료 ${recipe.ingredients.length} · 스텝 ${recipe.steps.length} · 태그 [${recipe.tags.join(", ")}] · ${ms}ms`);
      const withTime = recipe.steps.filter((s) => s.startTime !== undefined).length;
      console.log(`    타임스탬프 매핑: ${withTime}/${recipe.steps.length} 스텝`);
      success++;
    } catch (err) {
      console.log(`  ✗ ${(err as Error).message}`);
    }
  }

  console.log(`\n총 ${targets.length}개 중 ${success}개 성공 (${Math.round((success / targets.length) * 100)}%)`);
}

main();

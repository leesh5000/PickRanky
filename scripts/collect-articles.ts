import { collectArticles } from "../src/lib/article/collector";

async function main() {
  const limit = parseInt(process.argv[2] || "20", 10);

  console.log(`기사 수집 시작 (최대 ${limit}개)...`);
  console.log("=".repeat(50));

  const result = await collectArticles({
    source: "ALL",
    createJob: true,
    limit,
  });

  console.log("=".repeat(50));
  console.log("수집 결과:");
  console.log(`  총 수집: ${result.total}개`);
  console.log(`  새 기사: ${result.newArticles}개`);
  console.log(`  중복: ${result.duplicates}개`);
  console.log(`  요약 생성: ${result.summarized}개`);
  console.log(`  연관 상품: ${result.linkedProducts}개`);

  if (result.errors.length > 0) {
    console.log(`  오류: ${result.errors.length}개`);
    result.errors.slice(0, 5).forEach((e) => console.log(`    - ${e}`));
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("수집 오류:", error);
  process.exit(1);
});

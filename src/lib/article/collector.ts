import { PrismaClient, ArticleSource } from "@prisma/client";
import { fetchAllNaverRss, type ParsedArticle as NaverArticle } from "./naver-rss";
import { fetchAllGoogleNews, type ParsedArticle as GoogleArticle } from "./google-news";
import { fetchArticleContentWithRetry } from "./content-fetcher";
import { summarizeArticle } from "@/lib/openai/client";

const prisma = new PrismaClient();

type ParsedArticle = NaverArticle | GoogleArticle;

export interface CollectionResult {
  total: number;
  newArticles: number;
  duplicates: number;
  summarized: number;
  linkedProducts: number;
  errors: string[];
}

export async function collectArticles(): Promise<CollectionResult> {
  const result: CollectionResult = {
    total: 0,
    newArticles: 0,
    duplicates: 0,
    summarized: 0,
    linkedProducts: 0,
    errors: [],
  };

  try {
    // 1. 네이버 RSS에서 기사 수집
    console.log("네이버 RSS 수집 시작...");
    const naverArticles = await fetchAllNaverRss();
    console.log(`네이버 기사 ${naverArticles.length}개 수집`);

    // 2. Google News에서 기사 수집
    console.log("Google News 수집 시작...");
    const googleArticles = await fetchAllGoogleNews();
    console.log(`Google 기사 ${googleArticles.length}개 수집`);

    const allArticles = [...naverArticles, ...googleArticles];
    result.total = allArticles.length;

    // 3. 중복 체크 및 저장
    for (const article of allArticles) {
      try {
        // URL 기반 중복 체크
        const existing = await prisma.article.findUnique({
          where: { originalUrl: article.originalUrl },
        });

        if (existing) {
          result.duplicates++;
          continue;
        }

        // 새 기사 저장
        const newArticle = await prisma.article.create({
          data: {
            title: article.title,
            originalUrl: article.originalUrl,
            source: article.source as ArticleSource,
            category: article.category,
            publishedAt: article.publishedAt,
            collectedAt: new Date(),
          },
        });

        result.newArticles++;

        // 4. 기사 본문 크롤링 및 요약 생성 (동기 처리)
        try {
          const success = await processArticleSummary(newArticle.id, article.originalUrl);
          if (success) result.summarized++;
        } catch (error) {
          result.errors.push(`요약 생성 실패 (${newArticle.id}): ${error}`);
        }

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`기사 저장 실패: ${message}`);
      }
    }

    // 5. 카테고리 기반 연관 상품 연결
    const linkedCount = await linkArticlesToProducts();
    result.linkedProducts = linkedCount;

    console.log("기사 수집 완료:", result);
    return result;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`수집 프로세스 오류: ${message}`);
    return result;
  }
}

async function processArticleSummary(articleId: string, url: string): Promise<boolean> {
  try {
    // 본문 크롤링
    const content = await fetchArticleContentWithRetry(url);
    if (!content || !content.content) {
      console.log(`본문 크롤링 실패: ${url}`);
      return false;
    }

    // AI 요약 생성
    const summary = await summarizeArticle(content.content);
    if (!summary) {
      console.log(`요약 생성 실패: ${url}`);
      return false;
    }

    // DB 업데이트
    await prisma.article.update({
      where: { id: articleId },
      data: {
        summary,
        thumbnailUrl: content.thumbnailUrl,
      },
    });

    return true;
  } catch (error) {
    console.error(`기사 처리 오류 (${articleId}):`, error);
    return false;
  }
}

export async function linkArticlesToProducts(): Promise<number> {
  let linkedCount = 0;

  try {
    // 연관 상품이 없는 기사 조회
    const articlesWithoutProducts = await prisma.article.findMany({
      where: {
        isActive: true,
        category: { not: null },
        products: { none: {} },
      },
      select: {
        id: true,
        category: true,
      },
    });

    for (const article of articlesWithoutProducts) {
      if (!article.category) continue;

      // 같은 카테고리의 활성 상품 조회 (최대 5개)
      const products = await prisma.product.findMany({
        where: {
          category: article.category,
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true },
      });

      if (products.length > 0) {
        // 연관 상품 연결
        await prisma.articleProduct.createMany({
          data: products.map((product) => ({
            articleId: article.id,
            productId: product.id,
          })),
          skipDuplicates: true,
        });

        linkedCount += products.length;
      }
    }

    console.log(`${linkedCount}개 연관 상품 연결 완료`);
    return linkedCount;

  } catch (error) {
    console.error("상품 연결 오류:", error);
    return linkedCount;
  }
}

export async function summarizeUnsummarizedArticles(): Promise<number> {
  let summarizedCount = 0;

  try {
    // 요약이 없는 기사 조회
    const articles = await prisma.article.findMany({
      where: {
        isActive: true,
        summary: null,
      },
      select: {
        id: true,
        originalUrl: true,
      },
      take: 10, // 한 번에 10개씩 처리
    });

    for (const article of articles) {
      const success = await processArticleSummary(article.id, article.originalUrl);
      if (success) {
        summarizedCount++;
      }
      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return summarizedCount;

  } catch (error) {
    console.error("요약 생성 오류:", error);
    return summarizedCount;
  }
}

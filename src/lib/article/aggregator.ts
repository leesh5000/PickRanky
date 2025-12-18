import prisma from "@/lib/prisma";
import { calculateArticleScore } from "./score-calculator";
import { PeriodType } from "@prisma/client";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";

/**
 * Get or create an article ranking period
 */
export async function getOrCreateArticlePeriod(
  periodType: PeriodType,
  date: Date
): Promise<string> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let startedAt: Date;
  let endedAt: Date;
  let periodMonth: number | null = null;
  let periodDay: number | null = null;

  switch (periodType) {
    case "DAILY":
      startedAt = startOfDay(date);
      endedAt = endOfDay(date);
      periodMonth = month;
      periodDay = day;
      break;
    case "MONTHLY":
      startedAt = startOfMonth(date);
      endedAt = endOfMonth(date);
      periodMonth = month;
      break;
    default:
      startedAt = startOfDay(date);
      endedAt = endOfDay(date);
      periodMonth = month;
      periodDay = day;
  }

  // Try to find existing period
  let period = await prisma.articleRankingPeriod.findFirst({
    where: {
      periodType,
      year,
      month: periodMonth,
      day: periodDay,
    },
  });

  // Create if not exists
  if (!period) {
    period = await prisma.articleRankingPeriod.create({
      data: {
        periodType,
        year,
        month: periodMonth,
        day: periodDay,
        startedAt,
        endedAt,
      },
    });
  }

  return period.id;
}

/**
 * Get the previous period ID for rank comparison
 */
async function getPreviousPeriodId(
  periodType: PeriodType,
  currentPeriodId: string
): Promise<string | null> {
  const currentPeriod = await prisma.articleRankingPeriod.findUnique({
    where: { id: currentPeriodId },
  });

  if (!currentPeriod) return null;

  let previousPeriod = null;

  if (periodType === "DAILY") {
    // Find the previous day's period
    const previousDate = new Date(currentPeriod.startedAt);
    previousDate.setDate(previousDate.getDate() - 1);

    previousPeriod = await prisma.articleRankingPeriod.findFirst({
      where: {
        periodType: "DAILY",
        year: previousDate.getFullYear(),
        month: previousDate.getMonth() + 1,
        day: previousDate.getDate(),
      },
    });
  } else if (periodType === "MONTHLY") {
    // Find the previous month's period
    const previousDate = new Date(currentPeriod.startedAt);
    previousDate.setMonth(previousDate.getMonth() - 1);

    previousPeriod = await prisma.articleRankingPeriod.findFirst({
      where: {
        periodType: "MONTHLY",
        year: previousDate.getFullYear(),
        month: previousDate.getMonth() + 1,
      },
    });
  }

  return previousPeriod?.id || null;
}

/**
 * Calculate rankings for all active articles in a period
 */
export async function calculateArticleRankingsForPeriod(
  periodId: string
): Promise<number> {
  // Get all active articles with their view/share counts
  const articles = await prisma.article.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          views: true,
          shares: true,
        },
      },
    },
  });

  if (articles.length === 0) {
    return 0;
  }

  // Get period info
  const period = await prisma.articleRankingPeriod.findUnique({
    where: { id: periodId },
  });

  if (!period) {
    throw new Error(`Period not found: ${periodId}`);
  }

  // Get previous period for rank comparison
  const previousPeriodId = await getPreviousPeriodId(period.periodType, periodId);
  const previousRankings = previousPeriodId
    ? await prisma.articleRanking.findMany({
        where: { periodId: previousPeriodId },
        select: { articleId: true, rank: true },
      })
    : [];

  const previousRankMap = new Map(
    previousRankings.map((r) => [r.articleId, r.rank])
  );

  // Calculate scores for all articles
  const articleScores = articles.map((article) => {
    const score = calculateArticleScore({
      viewCount: article._count.views,
      shareCount: article._count.shares,
      publishedAt: new Date(article.publishedAt),
    });

    return {
      articleId: article.id,
      score: score.totalScore,
      viewCount: article._count.views,
      shareCount: article._count.shares,
    };
  });

  // Sort by score descending
  articleScores.sort((a, b) => b.score - a.score);

  // Delete existing rankings for this period
  await prisma.articleRanking.deleteMany({
    where: { periodId },
  });

  // Create new rankings
  const rankingsData = articleScores.map((as, index) => ({
    articleId: as.articleId,
    periodId,
    rank: index + 1,
    previousRank: previousRankMap.get(as.articleId) || null,
    score: as.score,
    viewCount: as.viewCount,
    shareCount: as.shareCount,
  }));

  await prisma.articleRanking.createMany({
    data: rankingsData,
  });

  return rankingsData.length;
}

/**
 * Aggregate daily article rankings
 */
export async function aggregateDailyArticleRankings(date: Date = new Date()): Promise<number> {
  const periodId = await getOrCreateArticlePeriod("DAILY", date);
  return calculateArticleRankingsForPeriod(periodId);
}

/**
 * Aggregate monthly article rankings
 */
export async function aggregateMonthlyArticleRankings(date: Date = new Date()): Promise<number> {
  const periodId = await getOrCreateArticlePeriod("MONTHLY", date);
  return calculateArticleRankingsForPeriod(periodId);
}

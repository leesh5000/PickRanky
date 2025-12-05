import prisma from "@/lib/prisma";
import {
  calculateVideoScore,
  calculateProductScore,
  VideoMetricsForScore,
  VideoWithScore,
} from "./score-calculator";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";

export type PeriodType = "YEARLY" | "MONTHLY" | "DAILY" | "FOUR_HOURLY";

/**
 * Get or create a ranking period
 */
export async function getOrCreatePeriod(
  periodType: PeriodType,
  date: Date
): Promise<string> {
  let year = date.getFullYear();
  let month: number | null = null;
  let day: number | null = null;
  let hourSlot: number | null = null;
  let startedAt: Date;
  let endedAt: Date;

  switch (periodType) {
    case "YEARLY":
      startedAt = startOfYear(date);
      endedAt = endOfYear(date);
      break;
    case "MONTHLY":
      month = date.getMonth() + 1;
      startedAt = startOfMonth(date);
      endedAt = endOfMonth(date);
      break;
    case "DAILY":
      month = date.getMonth() + 1;
      day = date.getDate();
      startedAt = startOfDay(date);
      endedAt = endOfDay(date);
      break;
    case "FOUR_HOURLY":
      month = date.getMonth() + 1;
      day = date.getDate();
      hourSlot = Math.floor(date.getHours() / 4) * 4;
      startedAt = new Date(date);
      startedAt.setHours(hourSlot, 0, 0, 0);
      endedAt = new Date(startedAt);
      endedAt.setHours(hourSlot + 4, 0, 0, 0);
      endedAt.setMilliseconds(-1);
      break;
  }

  // Try to find existing period
  const existing = await prisma.rankingPeriod.findFirst({
    where: {
      periodType,
      year,
      month,
      day,
      hourSlot,
    },
  });

  if (existing) {
    return existing.id;
  }

  // Create new period
  const period = await prisma.rankingPeriod.create({
    data: {
      periodType,
      year,
      month,
      day,
      hourSlot,
      startedAt,
      endedAt,
    },
  });

  return period.id;
}

/**
 * Calculate and save rankings for a specific period
 */
export async function calculateRankingsForPeriod(
  periodId: string,
  previousPeriodId?: string
): Promise<void> {
  // Get all active products with their videos and latest metrics
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      videos: {
        where: { isActive: true },
        include: {
          metrics: {
            orderBy: { collectedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  // Get previous rankings if available
  const previousRankings = previousPeriodId
    ? await prisma.productRanking.findMany({
        where: { periodId: previousPeriodId },
        select: { productId: true, rank: true },
      })
    : [];
  const previousRankMap = new Map(
    previousRankings.map((r) => [r.productId, r.rank])
  );

  // Calculate scores for each product
  const productScores: Array<{
    productId: string;
    score: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    videoCount: number;
    avgEngagement: number;
  }> = [];

  for (const product of products) {
    if (product.videos.length === 0) continue;

    // Calculate video scores
    const videosWithScores: VideoWithScore[] = product.videos.map((video) => {
      const latestMetric = video.metrics[0];
      const metrics: VideoMetricsForScore = {
        viewCount: latestMetric?.viewCount || 0,
        likeCount: latestMetric?.likeCount || 0,
        commentCount: latestMetric?.commentCount || 0,
        subscriberCount: video.subscriberCount,
        publishedAt: video.publishedAt,
        videoType: video.videoType,
      };

      return {
        score: calculateVideoScore(metrics),
        viewCount: metrics.viewCount,
        likeCount: metrics.likeCount,
        commentCount: metrics.commentCount,
      };
    });

    // Calculate product aggregate score
    const productScore = calculateProductScore(videosWithScores);

    if (productScore.score > 0) {
      productScores.push({
        productId: product.id,
        ...productScore,
      });
    }
  }

  // Sort by score and assign ranks
  productScores.sort((a, b) => b.score - a.score);

  // Delete existing rankings for this period
  await prisma.productRanking.deleteMany({
    where: { periodId },
  });

  // Create new rankings
  const rankings = productScores.map((ps, index) => ({
    productId: ps.productId,
    periodId,
    rank: index + 1,
    previousRank: previousRankMap.get(ps.productId) || null,
    score: ps.score,
    totalViews: ps.totalViews,
    totalLikes: ps.totalLikes,
    totalComments: ps.totalComments,
    videoCount: ps.videoCount,
    avgEngagement: ps.avgEngagement,
  }));

  if (rankings.length > 0) {
    await prisma.productRanking.createMany({
      data: rankings,
    });
  }
}

/**
 * Get the previous period ID for rank comparison
 */
export async function getPreviousPeriodId(
  periodType: PeriodType,
  currentDate: Date
): Promise<string | undefined> {
  let prevDate: Date;

  switch (periodType) {
    case "YEARLY":
      prevDate = new Date(currentDate);
      prevDate.setFullYear(prevDate.getFullYear() - 1);
      break;
    case "MONTHLY":
      prevDate = new Date(currentDate);
      prevDate.setMonth(prevDate.getMonth() - 1);
      break;
    case "DAILY":
      prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      break;
    case "FOUR_HOURLY":
      prevDate = new Date(currentDate);
      prevDate.setHours(prevDate.getHours() - 4);
      break;
  }

  const year = prevDate.getFullYear();
  const month = periodType !== "YEARLY" ? prevDate.getMonth() + 1 : null;
  const day =
    periodType === "DAILY" || periodType === "FOUR_HOURLY"
      ? prevDate.getDate()
      : null;
  const hourSlot =
    periodType === "FOUR_HOURLY"
      ? Math.floor(prevDate.getHours() / 4) * 4
      : null;

  const period = await prisma.rankingPeriod.findFirst({
    where: {
      periodType,
      year,
      month,
      day,
      hourSlot,
    },
  });

  return period?.id;
}

/**
 * Aggregate daily rankings from 4-hourly data
 */
export async function aggregateDailyRankings(date: Date): Promise<void> {
  const periodId = await getOrCreatePeriod("DAILY", date);
  const previousPeriodId = await getPreviousPeriodId("DAILY", date);
  await calculateRankingsForPeriod(periodId, previousPeriodId);
}

/**
 * Aggregate monthly rankings from daily data
 */
export async function aggregateMonthlyRankings(date: Date): Promise<void> {
  const periodId = await getOrCreatePeriod("MONTHLY", date);
  const previousPeriodId = await getPreviousPeriodId("MONTHLY", date);
  await calculateRankingsForPeriod(periodId, previousPeriodId);
}

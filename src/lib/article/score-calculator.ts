import { differenceInHours } from "date-fns";

export interface ArticleMetricsForScore {
  viewCount: number;
  shareCount: number;
  publishedAt: Date;
}

export interface ArticleScoreBreakdown {
  viewScore: number;
  shareScore: number;
  recencyScore: number;
  totalScore: number;
  details: {
    viewCount: number;
    shareCount: number;
    hoursSincePublished: number;
  };
}

/**
 * 기사 점수 계산 (100점 만점)
 *
 * - 조회수 점수 (0-50점): log scale 기반
 *   - 100조회 = ~17점, 1K = ~25점, 10K = ~33점, 100K = ~42점, 1M = ~50점
 *
 * - 공유수 점수 (0-30점): sqrt scale 기반
 *   - 공유는 적극적인 참여이므로 높은 가중치
 *   - 10공유 = ~9점, 50공유 = ~21점, 100공유 = ~30점
 *
 * - 최신성 점수 (0-20점): 지수 감쇠 (24시간 반감기)
 *   - 1시간 전 = 19점, 12시간 전 = 14점, 24시간 전 = 10점, 48시간 전 = 5점
 */
export function calculateArticleScore(
  metrics: ArticleMetricsForScore
): ArticleScoreBreakdown {
  const { viewCount, shareCount, publishedAt } = metrics;

  // 1. View Score (0-50 points)
  // log10 scale: log10(100) = 2, log10(1000) = 3, log10(10000) = 4, etc.
  // Normalize to 0-50 range with max ~1M views
  const viewScore = viewCount > 0
    ? Math.min(50, (Math.log10(viewCount + 1) / 6) * 50)
    : 0;

  // 2. Share Score (0-30 points)
  // sqrt scale to reward early shares more
  // sqrt(10) = 3.16, sqrt(50) = 7.07, sqrt(100) = 10
  const shareScore = shareCount > 0
    ? Math.min(30, Math.sqrt(shareCount) * 3)
    : 0;

  // 3. Recency Score (0-20 points)
  // Exponential decay with 24-hour half-life
  // score = 20 * e^(-hours / 24)
  const hoursSincePublished = Math.max(0, differenceInHours(new Date(), publishedAt));
  const recencyScore = Math.min(20, 20 * Math.exp(-hoursSincePublished / 24));

  // Total Score (capped at 100)
  const totalScore = Math.min(
    100,
    Math.round((viewScore + shareScore + recencyScore) * 100) / 100
  );

  return {
    viewScore: Math.round(viewScore * 100) / 100,
    shareScore: Math.round(shareScore * 100) / 100,
    recencyScore: Math.round(recencyScore * 100) / 100,
    totalScore,
    details: {
      viewCount,
      shareCount,
      hoursSincePublished,
    },
  };
}

export interface RankChange {
  type: "UP" | "DOWN" | "SAME" | "NEW";
  value: number | null;
  label: string;
}

export function getArticleRankChange(
  currentRank: number,
  previousRank: number | null
): RankChange {
  if (previousRank === null || previousRank === 0) {
    return { type: "NEW", value: null, label: "NEW" };
  }

  const change = previousRank - currentRank;

  if (change > 0) {
    return { type: "UP", value: change, label: `+${change}` };
  }

  if (change < 0) {
    return { type: "DOWN", value: Math.abs(change), label: `${change}` };
  }

  return { type: "SAME", value: 0, label: "-" };
}

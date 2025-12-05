import { differenceInDays } from "date-fns";

export interface VideoMetricsForScore {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  subscriberCount: number | null;
  publishedAt: Date;
  videoType: "REGULAR" | "SHORTS";
}

export interface VideoScoreBreakdown {
  viewScore: number;        // 0-35 points
  engagementScore: number;  // 0-30 points
  viralityScore: number;    // 0-20 points
  recencyScore: number;     // 0-15 points
  shortsBonus: number;      // 1.0 or 1.05 multiplier
  totalScore: number;       // 0-100 points (capped)
  details: {
    viewCount: number;
    engagementRate: number;
    viewToSubRatio: number | null;
    daysSincePublished: number;
    isShorts: boolean;
  };
}

/**
 * Calculate individual video score with detailed breakdown
 * Maximum score is 100 points
 *
 * Components:
 * - View Score: 0-35 points (log scale, 10M views = 35 points)
 * - Engagement Score: 0-30 points (engagement rate * 300, capped)
 * - Virality Score: 0-20 points (views/subscribers * 10, capped)
 * - Recency Score: 0-15 points (exponential decay, 45-day half-life)
 * - Shorts Bonus: 1.05x multiplier for Shorts videos
 */
export function calculateVideoScoreWithBreakdown(
  metrics: VideoMetricsForScore
): VideoScoreBreakdown {
  // 1. View Score (0-35 points)
  // Logarithmic scale: 1K=15, 10K=20, 100K=25, 1M=30, 10M=35
  const viewScore = metrics.viewCount > 0
    ? Math.min(35, (Math.log10(metrics.viewCount + 1) / 7) * 35)
    : 0;

  // 2. Engagement Score (0-30 points)
  // (likes + comments*2) / views ratio
  // 5% engagement = 15 points, 10%+ = 30 points
  let engagementScore = 0;
  let engagementRate = 0;
  if (metrics.viewCount > 0) {
    engagementRate = (metrics.likeCount + metrics.commentCount * 2) / metrics.viewCount;
    engagementScore = Math.min(30, engagementRate * 300);
  }

  // 3. Virality Score (0-20 points)
  // views / subscribers ratio
  // 1x = 10 points, 2x+ = 20 points
  let viralityScore = 10; // Default if no subscriber count
  let viewToSubRatio: number | null = null;
  if (metrics.subscriberCount && metrics.subscriberCount > 0) {
    viewToSubRatio = metrics.viewCount / metrics.subscriberCount;
    viralityScore = Math.min(20, viewToSubRatio * 10);
  }

  // 4. Recency Score (0-15 points)
  // Exponential decay: today = 15, 7 days ≈ 13, 30 days ≈ 8, 90 days ≈ 2
  const daysSincePublished = differenceInDays(new Date(), metrics.publishedAt);
  const recencyScore = Math.min(15, 15 * Math.exp(-daysSincePublished / 45));

  // 5. Shorts Bonus (5% multiplier for Shorts)
  const shortsBonus = metrics.videoType === "SHORTS" ? 1.05 : 1.0;

  // Calculate total score (capped at 100)
  const rawScore = (viewScore + engagementScore + viralityScore + recencyScore) * shortsBonus;
  const totalScore = Math.min(100, Math.round(rawScore * 100) / 100);

  return {
    viewScore: Math.round(viewScore * 100) / 100,
    engagementScore: Math.round(engagementScore * 100) / 100,
    viralityScore: Math.round(viralityScore * 100) / 100,
    recencyScore: Math.round(recencyScore * 100) / 100,
    shortsBonus,
    totalScore,
    details: {
      viewCount: metrics.viewCount,
      engagementRate: Math.round(engagementRate * 10000) / 100, // percentage
      viewToSubRatio: viewToSubRatio ? Math.round(viewToSubRatio * 100) / 100 : null,
      daysSincePublished,
      isShorts: metrics.videoType === "SHORTS",
    },
  };
}

/**
 * Calculate individual video score
 * Returns a score between 0 and 100
 */
export function calculateVideoScore(metrics: VideoMetricsForScore): number {
  return calculateVideoScoreWithBreakdown(metrics).totalScore;
}

export interface VideoWithScore {
  score: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface ProductScoreBreakdown {
  score: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  videoCount: number;
  avgEngagement: number;
  breakdown: {
    topVideoScores: { rank: number; score: number; weight: number; contribution: number }[];
    weightedAvgScore: number;
    videoCountBonus: number;
  };
}

/**
 * Calculate product aggregate score from its videos with breakdown
 * Maximum score is 100 points
 *
 * Algorithm:
 * - Weighted average of top 5 videos (weights: 1.0, 0.7, 0.5, 0.35, 0.25)
 * - Video count bonus: 0-5 points based on number of videos
 * - Final score capped at 100
 */
export function calculateProductScoreWithBreakdown(videos: VideoWithScore[]): ProductScoreBreakdown {
  if (videos.length === 0) {
    return {
      score: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      videoCount: 0,
      avgEngagement: 0,
      breakdown: {
        topVideoScores: [],
        weightedAvgScore: 0,
        videoCountBonus: 0,
      },
    };
  }

  // Calculate totals
  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
  const totalLikes = videos.reduce((sum, v) => sum + v.likeCount, 0);
  const totalComments = videos.reduce((sum, v) => sum + v.commentCount, 0);
  const videoCount = videos.length;

  // Calculate average engagement
  const avgEngagement = totalViews > 0
    ? ((totalLikes + totalComments) / totalViews) * 100
    : 0;

  // Weighted average of top 5 videos (better weights for more balanced scoring)
  const weights = [1.0, 0.7, 0.5, 0.35, 0.25];
  const sortedVideos = [...videos].sort((a, b) => b.score - a.score);
  const topVideos = sortedVideos.slice(0, 5);

  let weightedSum = 0;
  let totalWeight = 0;
  const topVideoScores: { rank: number; score: number; weight: number; contribution: number }[] = [];

  topVideos.forEach((video, index) => {
    const weight = weights[index] || 0.2;
    const contribution = video.score * weight;
    weightedSum += contribution;
    totalWeight += weight;
    topVideoScores.push({
      rank: index + 1,
      score: Math.round(video.score * 100) / 100,
      weight: Math.round(weight * 100) / 100,
      contribution: Math.round(contribution * 100) / 100,
    });
  });

  const weightedAvgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Video count bonus (0-5 points)
  // 1 video = 0, 2 videos = 1, 3 = 2, 5 = 3, 10+ = 5
  const videoCountBonus = Math.min(5, Math.log2(videoCount + 1) * 2);

  // Final score (capped at 100)
  const finalScore = Math.min(100, Math.round((weightedAvgScore + videoCountBonus) * 100) / 100);

  return {
    score: finalScore,
    totalViews,
    totalLikes,
    totalComments,
    videoCount,
    avgEngagement: Math.round(avgEngagement * 100) / 100,
    breakdown: {
      topVideoScores,
      weightedAvgScore: Math.round(weightedAvgScore * 100) / 100,
      videoCountBonus: Math.round(videoCountBonus * 100) / 100,
    },
  };
}

/**
 * Calculate product aggregate score from its videos
 * Returns a score between 0 and 100
 */
export function calculateProductScore(videos: VideoWithScore[]): {
  score: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  videoCount: number;
  avgEngagement: number;
} {
  const result = calculateProductScoreWithBreakdown(videos);
  return {
    score: result.score,
    totalViews: result.totalViews,
    totalLikes: result.totalLikes,
    totalComments: result.totalComments,
    videoCount: result.videoCount,
    avgEngagement: result.avgEngagement,
  };
}

export interface RankChange {
  type: "UP" | "DOWN" | "SAME" | "NEW";
  value: number | null;
  label: string;
}

/**
 * Calculate rank change from previous rank
 */
export function getRankChange(
  currentRank: number,
  previousRank: number | null
): RankChange {
  if (previousRank === null) {
    return { type: "NEW", value: null, label: "NEW" };
  }

  const change = previousRank - currentRank;

  if (change > 0) {
    return { type: "UP", value: change, label: `+${change}` };
  } else if (change < 0) {
    return { type: "DOWN", value: Math.abs(change), label: `${change}` };
  } else {
    return { type: "SAME", value: 0, label: "-" };
  }
}

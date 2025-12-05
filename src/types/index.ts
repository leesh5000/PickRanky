// Common types used across the application

export type Category = "electronics" | "beauty" | "appliances" | "food";

export const CATEGORIES: Record<Category, string> = {
  electronics: "전자기기/IT",
  beauty: "뷰티/화장품",
  appliances: "가전제품",
  food: "음식",
};

export type PeriodType = "YEARLY" | "MONTHLY" | "DAILY" | "FOUR_HOURLY";

export type VideoType = "REGULAR" | "SHORTS";

export interface Product {
  id: string;
  name: string;
  normalizedName: string;
  category: Category | null;
  thumbnailUrl: string | null;
  affiliateUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  youtubeId: string;
  productId: string;
  title: string;
  description: string | null;
  channelId: string;
  channelName: string;
  subscriberCount: number | null;
  publishedAt: Date;
  videoType: VideoType;
  thumbnailUrl: string | null;
  duration: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoMetric {
  id: string;
  videoId: string;
  collectedAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  subscriberCount: number | null;
}

export interface RankingPeriod {
  id: string;
  periodType: PeriodType;
  year: number;
  month: number | null;
  day: number | null;
  hourSlot: number | null;
  startedAt: Date;
  endedAt: Date;
}

export interface ProductRanking {
  id: string;
  productId: string;
  periodId: string;
  rank: number;
  previousRank: number | null;
  score: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  videoCount: number;
  avgEngagement: number;
  createdAt: Date;
}

export interface RankChange {
  type: "UP" | "DOWN" | "SAME" | "NEW";
  value: number | null;
  label: string;
}

export interface RankingWithProduct extends ProductRanking {
  product: Product;
  change: RankChange;
}

export interface ProductWithVideos extends Product {
  videos: (Video & { latestMetric?: VideoMetric })[];
  currentRanking?: ProductRanking;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RankingsResponse {
  period: RankingPeriod;
  rankings: RankingWithProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

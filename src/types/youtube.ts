// YouTube API related types

export interface YouTubeSearchParams {
  query: string;
  maxResults?: number;
  publishedAfter?: string;
  videoDuration?: "short" | "medium" | "long" | "any";
  order?: "date" | "viewCount" | "relevance";
  pageToken?: string;
}

export interface YouTubeSearchResultItem {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface YouTubeVideoDetailsItem {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  durationSeconds: number;
  isShorts: boolean;
}

export interface YouTubeChannelDetailsItem {
  channelId: string;
  title: string;
  subscriberCount: number;
  thumbnailUrl: string;
}

export interface YouTubeQuotaUsage {
  search: number; // 100 units per call
  videosList: number; // 1 unit per call
  channelsList: number; // 1 unit per call
}

// Daily quota limit: 10,000 units
export const YOUTUBE_DAILY_QUOTA = 10000;

// Quota costs
export const QUOTA_COSTS = {
  search: 100,
  videosList: 1,
  channelsList: 1,
} as const;

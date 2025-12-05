import { google, youtube_v3 } from "googleapis";

// Initialize YouTube API client
const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface YouTubeVideoDetails {
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
  isShorts: boolean;
}

export interface YouTubeChannelDetails {
  channelId: string;
  subscriberCount: number;
}

/**
 * Search for videos on YouTube
 */
export async function searchVideos(
  query: string,
  options: {
    maxResults?: number;
    publishedAfter?: string;
    videoDuration?: "short" | "medium" | "long" | "any";
    order?: "date" | "viewCount" | "relevance";
    pageToken?: string;
  } = {}
): Promise<{ items: YouTubeSearchResult[]; nextPageToken?: string }> {
  const {
    maxResults = 25,
    publishedAfter,
    videoDuration = "any",
    order = "relevance",
    pageToken,
  } = options;

  try {
    const response = await youtube.search.list({
      part: ["snippet"],
      q: query,
      type: ["video"],
      maxResults,
      publishedAfter,
      videoDuration,
      order,
      pageToken,
      regionCode: "KR",
      relevanceLanguage: "ko",
    });

    const items: YouTubeSearchResult[] = (response.data.items || []).map((item) => ({
      videoId: item.id?.videoId || "",
      title: item.snippet?.title || "",
      description: item.snippet?.description || "",
      channelId: item.snippet?.channelId || "",
      channelName: item.snippet?.channelTitle || "",
      publishedAt: item.snippet?.publishedAt || "",
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "",
    }));

    return {
      items,
      nextPageToken: response.data.nextPageToken || undefined,
    };
  } catch (error) {
    console.error("YouTube search error:", error);
    throw error;
  }
}

/**
 * Get detailed information for multiple videos
 */
export async function getVideoDetails(
  videoIds: string[]
): Promise<YouTubeVideoDetails[]> {
  if (videoIds.length === 0) return [];

  // YouTube API allows max 50 videos per request
  const chunks: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  const allVideos: YouTubeVideoDetails[] = [];

  for (const chunk of chunks) {
    try {
      const response = await youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails"],
        id: chunk,
      });

      const videos: YouTubeVideoDetails[] = (response.data.items || []).map((item) => {
        const duration = item.contentDetails?.duration || "PT0S";
        const durationSeconds = parseDuration(duration);
        const isShorts = durationSeconds <= 60; // Shorts are <= 60 seconds

        return {
          videoId: item.id || "",
          title: item.snippet?.title || "",
          description: item.snippet?.description || "",
          channelId: item.snippet?.channelId || "",
          channelName: item.snippet?.channelTitle || "",
          publishedAt: item.snippet?.publishedAt || "",
          thumbnailUrl:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            "",
          viewCount: parseInt(item.statistics?.viewCount || "0", 10),
          likeCount: parseInt(item.statistics?.likeCount || "0", 10),
          commentCount: parseInt(item.statistics?.commentCount || "0", 10),
          duration,
          isShorts,
        };
      });

      allVideos.push(...videos);
    } catch (error) {
      console.error("YouTube video details error:", error);
      throw error;
    }
  }

  return allVideos;
}

/**
 * Get channel details including subscriber count
 */
export async function getChannelDetails(
  channelIds: string[]
): Promise<Map<string, YouTubeChannelDetails>> {
  if (channelIds.length === 0) return new Map();

  const uniqueChannelIds = Array.from(new Set(channelIds));
  const channelMap = new Map<string, YouTubeChannelDetails>();

  // YouTube API allows max 50 channels per request
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueChannelIds.length; i += 50) {
    chunks.push(uniqueChannelIds.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    try {
      const response = await youtube.channels.list({
        part: ["statistics"],
        id: chunk,
      });

      for (const item of response.data.items || []) {
        if (item.id) {
          channelMap.set(item.id, {
            channelId: item.id,
            subscriberCount: parseInt(item.statistics?.subscriberCount || "0", 10),
          });
        }
      }
    } catch (error) {
      console.error("YouTube channel details error:", error);
      throw error;
    }
  }

  return channelMap;
}

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT1H30M15S -> 5415
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Calculate days ago date in ISO format
 */
export function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

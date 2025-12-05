import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  searchVideos,
  getVideoDetails,
  getChannelDetails,
  getDateDaysAgo,
} from "@/lib/youtube/client";
import { calculateVideoScore, VideoMetricsForScore } from "@/lib/ranking/score-calculator";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute timeout

interface SearchRequest {
  query: string;
  maxResults?: number;
  order?: "relevance" | "viewCount" | "date";
  publishedAfter?: string; // ISO date string or "7d", "30d", "90d", "any"
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: SearchRequest = await request.json();
    const { query, maxResults = 10, order = "relevance", publishedAfter } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 }
      );
    }

    // Parse publishedAfter parameter
    let publishedAfterDate: string | undefined;
    if (publishedAfter && publishedAfter !== "any") {
      if (publishedAfter === "7d") {
        publishedAfterDate = getDateDaysAgo(7);
      } else if (publishedAfter === "30d") {
        publishedAfterDate = getDateDaysAgo(30);
      } else if (publishedAfter === "90d") {
        publishedAfterDate = getDateDaysAgo(90);
      } else {
        // Assume it's an ISO date string
        publishedAfterDate = publishedAfter;
      }
    }

    // Step 1: Search for videos
    const searchResult = await searchVideos(query, {
      maxResults: Math.min(maxResults, 25),
      order,
      publishedAfter: publishedAfterDate,
    });

    if (searchResult.items.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          videos: [],
          nextPageToken: null,
        },
      });
    }

    // Step 2: Get video details (views, likes, comments, duration)
    const videoIds = searchResult.items.map((item) => item.videoId);
    const videoDetails = await getVideoDetails(videoIds);

    // Step 3: Get channel details (subscriber count)
    const channelIds = videoDetails.map((v) => v.channelId);
    const channelDetails = await getChannelDetails(channelIds);

    // Step 4: Build response with preview scores
    const videos = videoDetails.map((video) => {
      const channelInfo = channelDetails.get(video.channelId);
      const subscriberCount = channelInfo?.subscriberCount || null;

      // Calculate preview score
      const metrics: VideoMetricsForScore = {
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        subscriberCount,
        publishedAt: new Date(video.publishedAt),
        videoType: video.isShorts ? "SHORTS" : "REGULAR",
      };
      const previewScore = calculateVideoScore(metrics);

      // Parse duration to seconds
      const durationMatch = video.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const durationSeconds = durationMatch
        ? (parseInt(durationMatch[1] || "0") * 3600) +
          (parseInt(durationMatch[2] || "0") * 60) +
          parseInt(durationMatch[3] || "0")
        : 0;

      return {
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        channelId: video.channelId,
        channelName: video.channelName,
        thumbnailUrl: video.thumbnailUrl,
        publishedAt: video.publishedAt,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        duration: durationSeconds,
        isShorts: video.isShorts,
        subscriberCount,
        previewScore,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        videos,
        nextPageToken: searchResult.nextPageToken || null,
      },
    });
  } catch (error) {
    console.error("YouTube search API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to search YouTube: ${message}` },
      { status: 500 }
    );
  }
}

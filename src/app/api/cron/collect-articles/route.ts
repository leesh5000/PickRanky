import { NextRequest, NextResponse } from "next/server";
import { collectArticles, summarizeUnsummarizedArticles } from "@/lib/article/collector";
import {
  aggregateDailyArticleRankings,
  aggregateMonthlyArticleRankings,
} from "@/lib/article/aggregator";

export const maxDuration = 300; // 5 minutes timeout for Vercel

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow manual trigger in development
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    console.log("Starting article collection and ranking...");
    const startTime = Date.now();

    // Step 1: Collect new articles from RSS feeds
    console.log("Step 1: Collecting articles...");
    const collectionResult = await collectArticles();

    // Step 2: Summarize any unsummarized articles
    console.log("Step 2: Summarizing articles...");
    const summarizedCount = await summarizeUnsummarizedArticles();

    // Step 3: Calculate rankings
    console.log("Step 3: Calculating rankings...");
    const now = new Date();
    const dailyRankingsCount = await aggregateDailyArticleRankings(now);
    const monthlyRankingsCount = await aggregateMonthlyArticleRankings(now);

    const duration = Date.now() - startTime;

    console.log("Article collection and ranking completed:", {
      ...collectionResult,
      summarizedCount,
      dailyRankingsCount,
      monthlyRankingsCount,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      data: {
        collection: collectionResult,
        additionalSummarized: summarizedCount,
        dailyRankingsCount,
        monthlyRankingsCount,
        durationMs: duration,
      },
    });
  } catch (error) {
    console.error("Article collection and ranking failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Process failed: ${message}` },
      { status: 500 }
    );
  }
}

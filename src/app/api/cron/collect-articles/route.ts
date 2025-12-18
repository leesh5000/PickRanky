import { NextRequest, NextResponse } from "next/server";
import { collectArticles, summarizeUnsummarizedArticles } from "@/lib/article/collector";

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
    console.log("Starting article collection...");
    const startTime = Date.now();

    // Collect new articles from RSS feeds
    const result = await collectArticles();

    // Summarize any unsummarized articles
    const summarizedCount = await summarizeUnsummarizedArticles();

    const duration = Date.now() - startTime;

    console.log("Article collection completed:", {
      ...result,
      summarizedCount,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        additionalSummarized: summarizedCount,
        durationMs: duration,
      },
    });
  } catch (error) {
    console.error("Article collection failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Collection failed: ${message}` },
      { status: 500 }
    );
  }
}

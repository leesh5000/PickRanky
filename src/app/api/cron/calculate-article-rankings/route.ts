import { NextRequest, NextResponse } from "next/server";
import {
  aggregateDailyArticleRankings,
  aggregateMonthlyArticleRankings,
} from "@/lib/article/aggregator";

export const maxDuration = 60; // 1 minute timeout

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
    console.log("Starting article rankings calculation...");
    const startTime = Date.now();
    const now = new Date();

    // Calculate daily rankings
    const dailyCount = await aggregateDailyArticleRankings(now);
    console.log(`Daily rankings calculated: ${dailyCount} articles`);

    // Calculate monthly rankings (only at the end of the day or start of month)
    const monthlyCount = await aggregateMonthlyArticleRankings(now);
    console.log(`Monthly rankings calculated: ${monthlyCount} articles`);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        dailyRankingsCount: dailyCount,
        monthlyRankingsCount: monthlyCount,
        durationMs: duration,
      },
    });
  } catch (error) {
    console.error("Article rankings calculation failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Rankings calculation failed: ${message}` },
      { status: 500 }
    );
  }
}

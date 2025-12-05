import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  calculateVideoScoreWithBreakdown,
  calculateProductScoreWithBreakdown,
  VideoMetricsForScore,
} from "@/lib/ranking/score-calculator";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        videos: {
          where: { isActive: true },
          include: {
            metrics: {
              orderBy: { collectedAt: "desc" },
              take: 1,
            },
          },
          orderBy: { publishedAt: "desc" },
        },
        rankings: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            period: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Transform videos with latest metrics and score breakdown
    const videosWithMetricsAndScores = product.videos.map((video) => {
      const latestMetric = video.metrics[0] || null;

      // Calculate video score breakdown if metrics exist
      let scoreBreakdown = null;
      if (latestMetric) {
        const metricsForScore: VideoMetricsForScore = {
          viewCount: latestMetric.viewCount,
          likeCount: latestMetric.likeCount,
          commentCount: latestMetric.commentCount,
          subscriberCount: video.subscriberCount,
          publishedAt: video.publishedAt,
          videoType: video.videoType as "REGULAR" | "SHORTS",
        };
        scoreBreakdown = calculateVideoScoreWithBreakdown(metricsForScore);
      }

      return {
        ...video,
        latestMetric,
        scoreBreakdown,
        metrics: undefined, // Remove metrics array from response
      };
    });

    // Calculate product score breakdown
    const videosForProductScore = videosWithMetricsAndScores
      .filter((v) => v.scoreBreakdown)
      .map((v) => ({
        score: v.scoreBreakdown!.totalScore,
        viewCount: v.latestMetric?.viewCount || 0,
        likeCount: v.latestMetric?.likeCount || 0,
        commentCount: v.latestMetric?.commentCount || 0,
      }));

    const productScoreBreakdown = calculateProductScoreWithBreakdown(videosForProductScore);

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        videos: videosWithMetricsAndScores,
        productScoreBreakdown,
      },
    });
  } catch (error) {
    console.error("Product API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

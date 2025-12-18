import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const article = await prisma.article.findUnique({
      where: { id, isActive: true },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                thumbnailUrl: true,
                affiliateUrl: true,
                price: true,
                originalPrice: true,
                discountRate: true,
                category: true,
              },
            },
          },
        },
        _count: {
          select: { views: true, shares: true },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Get the latest ranking info
    const latestRanking = await prisma.articleRanking.findFirst({
      where: { articleId: id },
      orderBy: { createdAt: "desc" },
      include: {
        period: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        article: {
          ...article,
          products: article.products.map((ap) => ap.product),
          ranking: latestRanking
            ? {
                rank: latestRanking.rank,
                previousRank: latestRanking.previousRank,
                score: latestRanking.score,
                period: {
                  type: latestRanking.period.periodType,
                  startedAt: latestRanking.period.startedAt,
                  endedAt: latestRanking.period.endedAt,
                },
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error("News detail API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

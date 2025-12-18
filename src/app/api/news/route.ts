import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PeriodType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily";
    const category = searchParams.get("category");
    const source = searchParams.get("source");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Map period string to PeriodType
    const periodTypeMap: Record<string, PeriodType> = {
      daily: "DAILY",
      monthly: "MONTHLY",
    };
    const periodType = periodTypeMap[period] || "DAILY";

    // Find the latest ranking period
    const rankingPeriod = await prisma.articleRankingPeriod.findFirst({
      where: { periodType },
      orderBy: { startedAt: "desc" },
    });

    // Build article filter
    const articleWhere: any = { isActive: true };
    if (category) articleWhere.category = category;
    if (source) articleWhere.source = source;

    // If no ranking period exists, return articles directly sorted by publishedAt
    if (!rankingPeriod) {
      const [articles, total] = await Promise.all([
        prisma.article.findMany({
          where: articleWhere,
          include: {
            products: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    thumbnailUrl: true,
                    affiliateUrl: true,
                  },
                },
              },
              take: 3,
            },
            _count: {
              select: { views: true, shares: true },
            },
          },
          orderBy: { publishedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.article.count({ where: articleWhere }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          period: null,
          articles: articles.map((article, index) => ({
            ...article,
            rank: (page - 1) * limit + index + 1,
            previousRank: null,
            score: 0,
            products: article.products.map((ap) => ap.product),
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    }

    // Get rankings for this period
    const [rankings, total] = await Promise.all([
      prisma.articleRanking.findMany({
        where: {
          periodId: rankingPeriod.id,
          article: articleWhere,
        },
        include: {
          article: {
            include: {
              products: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      thumbnailUrl: true,
                      affiliateUrl: true,
                    },
                  },
                },
                take: 3,
              },
              _count: {
                select: { views: true, shares: true },
              },
            },
          },
        },
        orderBy: { rank: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.articleRanking.count({
        where: {
          periodId: rankingPeriod.id,
          article: articleWhere,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        period: {
          id: rankingPeriod.id,
          type: rankingPeriod.periodType,
          startedAt: rankingPeriod.startedAt,
          endedAt: rankingPeriod.endedAt,
        },
        articles: rankings.map((ranking) => ({
          ...ranking.article,
          rank: ranking.rank,
          previousRank: ranking.previousRank,
          score: ranking.score,
          products: ranking.article.products.map((ap) => ap.product),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}

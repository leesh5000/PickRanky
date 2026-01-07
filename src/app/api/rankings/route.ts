import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRankChange } from "@/lib/ranking/score-calculator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const period = searchParams.get("period") || "daily"; // daily, four_hourly, monthly, yearly
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear();
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : new Date().getMonth() + 1;
    const day = searchParams.get("day")
      ? parseInt(searchParams.get("day")!)
      : new Date().getDate();
    const slot = searchParams.get("slot")
      ? parseInt(searchParams.get("slot")!)
      : null;
    const category = searchParams.get("category");
    const sortBy = searchParams.get("sortBy") || "score"; // score, price, discount, videoCount
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    // Map period string to PeriodType enum
    const periodTypeMap: Record<string, string> = {
      yearly: "YEARLY",
      monthly: "MONTHLY",
      daily: "DAILY",
      four_hourly: "FOUR_HOURLY",
    };
    const periodType = periodTypeMap[period] || "DAILY";

    // Build period query
    const periodQuery: any = {
      periodType,
      year,
    };

    if (periodType !== "YEARLY") {
      periodQuery.month = month;
    }
    if (periodType === "DAILY" || periodType === "FOUR_HOURLY") {
      periodQuery.day = day;
    }
    if (periodType === "FOUR_HOURLY" && slot !== null) {
      periodQuery.hourSlot = slot;
    }

    // Find the ranking period
    const rankingPeriod = await prisma.rankingPeriod.findFirst({
      where: periodQuery,
      orderBy: { startedAt: "desc" },
    });

    // If no ranking period found, fallback to direct product query
    // 상품 등록일(createdAt) 기준으로 필터링
    if (!rankingPeriod) {
      // Build product filter
      const fallbackProductFilter: any = { isActive: true };
      if (category) {
        fallbackProductFilter.category = category;
      }

      // 날짜 기준 필터링 (상품 등록일 기준)
      if (periodType === "DAILY") {
        const startDate = new Date(year, month - 1, day, 0, 0, 0);
        const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        fallbackProductFilter.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      } else if (periodType === "MONTHLY") {
        const startDate = new Date(year, month - 1, 1, 0, 0, 0);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 해당 월의 마지막 날
        fallbackProductFilter.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Get total count for fallback
      const fallbackTotalCount = await prisma.product.count({
        where: fallbackProductFilter,
      });

      // Build orderBy for fallback based on sortBy parameter
      let fallbackOrderBy: any = { createdAt: "desc" };
      if (sortBy === "price") {
        fallbackOrderBy = { price: "asc" };
      } else if (sortBy === "priceDesc") {
        fallbackOrderBy = { price: "desc" };
      } else if (sortBy === "discount") {
        fallbackOrderBy = { discountRate: "desc" };
      } else if (sortBy === "videoCount") {
        fallbackOrderBy = [
          { videos: { _count: "desc" } },
          { createdAt: "desc" },
        ];
      }

      // Get products with pagination
      const fallbackProducts = await prisma.product.findMany({
        where: fallbackProductFilter,
        include: {
          videos: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: { videos: true },
          },
        },
        orderBy: fallbackOrderBy,
        skip: (page - 1) * limit,
        take: limit,
      });

      // Transform to ranking-like format
      const fallbackRankings = fallbackProducts.map((product, index) => ({
        id: `fallback-${product.id}`,
        rank: (page - 1) * limit + index + 1,
        previousRank: null,
        score: 0,
        totalViews: 0,
        totalLikes: 0,
        videoCount: product._count.videos,
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          thumbnailUrl: product.thumbnailUrl,
          price: product.price,
          originalPrice: product.originalPrice,
          discountRate: product.discountRate,
        },
        change: { type: "NEW" as const, value: null, label: "NEW" },
      }));

      return NextResponse.json({
        success: true,
        data: {
          period: null,
          rankings: fallbackRankings,
          pagination: {
            page,
            limit,
            total: fallbackTotalCount,
            totalPages: Math.ceil(fallbackTotalCount / limit),
          },
        },
      });
    }

    // Build product filter
    const productFilter: any = { isActive: true };
    if (category) {
      productFilter.category = category;
    }

    // 날짜 기준 필터링 (상품 등록일 기준)
    if (periodType === "DAILY") {
      const startDate = new Date(year, month - 1, day, 0, 0, 0);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      productFilter.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    } else if (periodType === "MONTHLY") {
      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      productFilter.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get total count
    const totalCount = await prisma.productRanking.count({
      where: {
        periodId: rankingPeriod.id,
        product: productFilter,
      },
    });

    // Build orderBy based on sortBy parameter
    let orderBy: any = { rank: "asc" };
    if (sortBy === "price") {
      orderBy = { product: { price: "asc" } };
    } else if (sortBy === "priceDesc") {
      orderBy = { product: { price: "desc" } };
    } else if (sortBy === "discount") {
      orderBy = { product: { discountRate: "desc" } };
    } else if (sortBy === "videoCount") {
      orderBy = { videoCount: "desc" };
    }

    // Get rankings with pagination
    const rankings = await prisma.productRanking.findMany({
      where: {
        periodId: rankingPeriod.id,
        product: productFilter,
      },
      include: {
        product: true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Transform rankings with rank change info
    const transformedRankings = rankings.map((ranking) => ({
      ...ranking,
      change: getRankChange(ranking.rank, ranking.previousRank),
    }));

    return NextResponse.json({
      success: true,
      data: {
        period: rankingPeriod,
        rankings: transformedRankings,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error("Rankings API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}

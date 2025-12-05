import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRankChange } from "@/lib/ranking/score-calculator";

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

    if (!rankingPeriod) {
      return NextResponse.json({
        success: true,
        data: {
          period: null,
          rankings: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        },
      });
    }

    // Build product filter
    const productFilter: any = { isActive: true };
    if (category) {
      productFilter.category = category;
    }

    // Get total count
    const totalCount = await prisma.productRanking.count({
      where: {
        periodId: rankingPeriod.id,
        product: productFilter,
      },
    });

    // Get rankings with pagination
    const rankings = await prisma.productRanking.findMany({
      where: {
        periodId: rankingPeriod.id,
        product: productFilter,
      },
      include: {
        product: true,
      },
      orderBy: { rank: "asc" },
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

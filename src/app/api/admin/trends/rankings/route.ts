import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateTrendRankings, generateAllRankings } from "@/lib/trends/ranking-generator";
import { PeriodType } from "@prisma/client";

/**
 * POST /api/admin/trends/rankings
 * Generate trend keyword rankings
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { periodType, year, month, day, generateAll } = body;

    let result;

    if (generateAll) {
      // Generate both daily and monthly rankings
      result = await generateAllRankings();

      // Log admin action
      await prisma.adminAction.create({
        data: {
          actionType: "CREATE",
          targetType: "trend_rankings",
          targetId: "all",
          details: {
            daily: {
              periodId: result.daily.periodId,
              rankingsCreated: result.daily.rankingsCreated,
            },
            monthly: {
              periodId: result.monthly.periodId,
              rankingsCreated: result.monthly.rankingsCreated,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Generated ${result.daily.rankingsCreated} daily rankings and ${result.monthly.rankingsCreated} monthly rankings`,
        data: result,
      });
    } else {
      // Generate rankings for specific period
      const type = (periodType as PeriodType) || "DAILY";
      result = await generateTrendRankings(type, { year, month, day });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          actionType: "CREATE",
          targetType: "trend_rankings",
          targetId: result.periodId,
          details: {
            periodType: type,
            year,
            month,
            day,
            rankingsCreated: result.rankingsCreated,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Generated ${result.rankingsCreated} rankings`,
        data: result,
      });
    }
  } catch (error) {
    console.error("Admin generate trend rankings API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to generate rankings: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/trends/rankings
 * Get ranking periods list
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const periodType = searchParams.get("periodType") as PeriodType | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const where: any = {};
    if (periodType) {
      where.periodType = periodType;
    }

    const periods = await prisma.trendRankingPeriod.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        _count: {
          select: { rankings: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        periods: periods.map((p) => ({
          id: p.id,
          periodType: p.periodType,
          year: p.year,
          month: p.month,
          day: p.day,
          startedAt: p.startedAt,
          endedAt: p.endedAt,
          createdAt: p.createdAt,
          rankingsCount: p._count.rankings,
        })),
      },
    });
  } catch (error) {
    console.error("Admin get trend ranking periods API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ranking periods" },
      { status: 500 }
    );
  }
}

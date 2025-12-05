import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = startOfDay(new Date());
    const weekAgo = subDays(today, 7);

    // Get counts
    const [
      totalProducts,
      totalVideos,
      totalClicks,
      totalViews,
      recentClicks,
      recentViews,
      recentJobs,
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.video.count({ where: { isActive: true } }),
      prisma.linkClick.count(),
      prisma.pageView.count(),
      prisma.linkClick.count({ where: { clickedAt: { gte: weekAgo } } }),
      prisma.pageView.count({ where: { viewedAt: { gte: weekAgo } } }),
      prisma.collectionJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Get clicks by day for the last 7 days
    const clicksByDay = await prisma.linkClick.groupBy({
      by: ["clickedAt"],
      where: { clickedAt: { gte: weekAgo } },
      _count: { id: true },
    });

    // Get top products by clicks
    const topProductsByClicks = await prisma.linkClick.groupBy({
      by: ["productId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const topProductIds = topProductsByClicks.map((p) => p.productId);
    const topProducts = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, category: true },
    });

    const topProductsWithClicks = topProductsByClicks.map((p) => {
      const product = topProducts.find((tp) => tp.id === p.productId);
      return {
        product,
        clicks: p._count.id,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalProducts,
          totalVideos,
          totalClicks,
          totalViews,
          recentClicks,
          recentViews,
        },
        recentJobs,
        topProducts: topProductsWithClicks,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

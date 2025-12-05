import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const type = searchParams.get("type") || "clicks"; // clicks, views

    const startDate = subDays(startOfDay(new Date()), days);

    if (type === "clicks") {
      // Get clicks grouped by date
      const clicks = await prisma.linkClick.findMany({
        where: { clickedAt: { gte: startDate } },
        select: { clickedAt: true },
        orderBy: { clickedAt: "asc" },
      });

      // Group by date
      const clicksByDate: Record<string, number> = {};
      for (const click of clicks) {
        const date = format(click.clickedAt, "yyyy-MM-dd");
        clicksByDate[date] = (clicksByDate[date] || 0) + 1;
      }

      // Get top products by clicks
      const topProducts = await prisma.linkClick.groupBy({
        by: ["productId"],
        where: { clickedAt: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      const productIds = topProducts.map((p) => p.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, category: true },
      });

      const topProductsWithNames = topProducts.map((p) => ({
        ...products.find((pr) => pr.id === p.productId),
        clicks: p._count.id,
      }));

      return NextResponse.json({
        success: true,
        data: {
          byDate: clicksByDate,
          topProducts: topProductsWithNames,
          total: clicks.length,
        },
      });
    } else if (type === "views") {
      // Get page views grouped by date
      const views = await prisma.pageView.findMany({
        where: { viewedAt: { gte: startDate } },
        select: { viewedAt: true, page: true },
        orderBy: { viewedAt: "asc" },
      });

      // Group by date
      const viewsByDate: Record<string, number> = {};
      for (const view of views) {
        const date = format(view.viewedAt, "yyyy-MM-dd");
        viewsByDate[date] = (viewsByDate[date] || 0) + 1;
      }

      // Group by page
      const viewsByPage: Record<string, number> = {};
      for (const view of views) {
        viewsByPage[view.page] = (viewsByPage[view.page] || 0) + 1;
      }

      return NextResponse.json({
        success: true,
        data: {
          byDate: viewsByDate,
          byPage: viewsByPage,
          total: views.length,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin analytics API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

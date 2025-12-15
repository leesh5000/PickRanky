import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20);

    // 전체 기간 클릭 회수 기반 인기 상품 조회
    const popularProducts = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        thumbnailUrl: true,
        affiliateUrl: true,
        price: true,
        originalPrice: true,
        discountRate: true,
        _count: {
          select: {
            clicks: true,
          },
        },
      },
      orderBy: {
        clicks: {
          _count: "desc",
        },
      },
      take: limit,
    });

    // 클릭 수가 0인 상품들은 최신 상품으로 대체
    const productsWithClicks = popularProducts.filter(
      (p) => p._count.clicks > 0
    );

    let result = productsWithClicks;

    // 클릭이 있는 상품이 limit보다 적으면 최신 상품으로 채움
    if (productsWithClicks.length < limit) {
      const existingIds = productsWithClicks.map((p) => p.id);
      const additionalProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          id: { notIn: existingIds },
        },
        select: {
          id: true,
          name: true,
          thumbnailUrl: true,
          affiliateUrl: true,
          price: true,
          originalPrice: true,
          discountRate: true,
          _count: {
            select: {
              clicks: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit - productsWithClicks.length,
      });

      result = [...productsWithClicks, ...additionalProducts];
    }

    // 응답 형태 변환
    const formattedProducts = result.map((product, index) => ({
      id: `popular-${product.id}`,
      rank: index + 1,
      score: product._count.clicks,
      product: {
        id: product.id,
        name: product.name,
        thumbnailUrl: product.thumbnailUrl,
        affiliateUrl: product.affiliateUrl,
        price: product.price,
        originalPrice: product.originalPrice,
        discountRate: product.discountRate,
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        products: formattedProducts,
      },
    });
  } catch (error) {
    console.error("Popular products API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch popular products" },
      { status: 500 }
    );
  }
}

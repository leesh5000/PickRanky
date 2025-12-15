import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20);

    // 최신 등록 상품 조회
    const newProducts = await prisma.product.findMany({
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
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    // 응답 형태 변환
    const formattedProducts = newProducts.map((product, index) => ({
      id: `new-${product.id}`,
      rank: index + 1,
      score: 0,
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
    console.error("New products API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch new products" },
      { status: 500 }
    );
  }
}

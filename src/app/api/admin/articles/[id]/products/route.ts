import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true, category: true },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Get linked products
    const linkedProducts = await prisma.articleProduct.findMany({
      where: { articleId: id },
      include: {
        product: {
          include: {
            _count: {
              select: { videos: true, clicks: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        products: linkedProducts.map((ap) => ap.product),
      },
    });
  } catch (error) {
    console.error("Admin get article products API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch article products" },
      { status: 500 }
    );
  }
}

interface AddProductsRequest {
  productIds: string[];
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body: AddProductsRequest = await request.json();
    const { productIds } = body;

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Product IDs are required" },
        { status: 400 }
      );
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Verify all products exist
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });

    if (existingProducts.length !== productIds.length) {
      return NextResponse.json(
        { success: false, error: "Some products not found" },
        { status: 400 }
      );
    }

    // Add products to article
    await prisma.$transaction(async (tx) => {
      await tx.articleProduct.createMany({
        data: productIds.map((productId) => ({
          articleId: id,
          productId,
        })),
        skipDuplicates: true,
      });

      // Log admin action
      await tx.adminAction.create({
        data: {
          actionType: "LINK",
          targetType: "article_product",
          targetId: id,
          details: {
            productIds,
            action: "add",
          },
        },
      });
    });

    // Get updated linked products
    const linkedProducts = await prisma.articleProduct.findMany({
      where: { articleId: id },
      include: {
        product: {
          include: {
            _count: {
              select: { videos: true, clicks: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        products: linkedProducts.map((ap) => ap.product),
      },
    });
  } catch (error) {
    console.error("Admin add article products API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to add products: ${message}` },
      { status: 500 }
    );
  }
}

interface RemoveProductsRequest {
  productIds: string[];
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body: RemoveProductsRequest = await request.json();
    const { productIds } = body;

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Product IDs are required" },
        { status: 400 }
      );
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Remove products from article
    await prisma.$transaction(async (tx) => {
      await tx.articleProduct.deleteMany({
        where: {
          articleId: id,
          productId: { in: productIds },
        },
      });

      // Log admin action
      await tx.adminAction.create({
        data: {
          actionType: "UNLINK",
          targetType: "article_product",
          targetId: id,
          details: {
            productIds,
            action: "remove",
          },
        },
      });
    });

    // Get remaining linked products
    const linkedProducts = await prisma.articleProduct.findMany({
      where: { articleId: id },
      include: {
        product: {
          include: {
            _count: {
              select: { videos: true, clicks: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        products: linkedProducts.map((ap) => ap.product),
      },
    });
  } catch (error) {
    console.error("Admin remove article products API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove products" },
      { status: 500 }
    );
  }
}

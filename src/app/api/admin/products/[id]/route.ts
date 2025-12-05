import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        videos: {
          include: {
            metrics: {
              orderBy: { collectedAt: "desc" },
              take: 1,
            },
          },
        },
        rankings: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { period: true },
        },
        _count: {
          select: { clicks: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Admin product API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, category, thumbnailUrl, thumbnailUrls, productUrl, affiliateUrl, isActive } = body;

    // Get old data for logging
    const oldProduct = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!oldProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (thumbnailUrls !== undefined) {
      updateData.thumbnailUrls = thumbnailUrls;
      // Also update thumbnailUrl to the first thumbnail for backwards compatibility
      updateData.thumbnailUrl = thumbnailUrls.length > 0 ? thumbnailUrls[0] : null;
    } else if (thumbnailUrl !== undefined) {
      updateData.thumbnailUrl = thumbnailUrl;
    }
    if (productUrl !== undefined) updateData.productUrl = productUrl;
    if (affiliateUrl !== undefined) updateData.affiliateUrl = affiliateUrl;
    if (isActive !== undefined) updateData.isActive = isActive;

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        actionType: "UPDATE_PRODUCT",
        targetType: "product",
        targetId: params.id,
        details: {
          before: oldProduct,
          after: product,
          changes: updateData,
        },
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Admin product update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Soft delete - just deactivate
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        actionType: "DELETE_PRODUCT",
        targetType: "product",
        targetId: params.id,
        details: { softDelete: true },
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Admin product delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

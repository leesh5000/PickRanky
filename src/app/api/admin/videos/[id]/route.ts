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
    const video = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        product: { select: { id: true, name: true } },
        metrics: {
          orderBy: { collectedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!video) {
      return NextResponse.json(
        { success: false, error: "Video not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: video });
  } catch (error) {
    console.error("Admin video API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch video" },
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
    const { productId, isActive } = body;

    const oldVideo = await prisma.video.findUnique({
      where: { id: params.id },
      include: { product: { select: { id: true, name: true } } },
    });

    if (!oldVideo) {
      return NextResponse.json(
        { success: false, error: "Video not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (productId !== undefined) {
      // Verify the target product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        return NextResponse.json(
          { success: false, error: "Target product not found" },
          { status: 404 }
        );
      }
      updateData.productId = productId;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const video = await prisma.video.update({
      where: { id: params.id },
      data: updateData,
      include: { product: { select: { id: true, name: true } } },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        actionType: "UPDATE_VIDEO",
        targetType: "video",
        targetId: params.id,
        details: {
          before: {
            productId: oldVideo.productId,
            productName: oldVideo.product.name,
            isActive: oldVideo.isActive,
          },
          after: {
            productId: video.productId,
            productName: video.product.name,
            isActive: video.isActive,
          },
          changes: updateData,
        },
      },
    });

    return NextResponse.json({ success: true, data: video });
  } catch (error) {
    console.error("Admin video update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update video" },
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
    const video = await prisma.video.findUnique({
      where: { id: params.id },
    });

    if (!video) {
      return NextResponse.json(
        { success: false, error: "Video not found" },
        { status: 404 }
      );
    }

    // Soft delete - deactivate the video
    const updatedVideo = await prisma.video.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        actionType: "DELETE_VIDEO",
        targetType: "video",
        targetId: params.id,
        details: { softDelete: true, videoTitle: video.title },
      },
    });

    return NextResponse.json({ success: true, data: updatedVideo });
  } catch (error) {
    console.error("Admin video delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete video" },
      { status: 500 }
    );
  }
}

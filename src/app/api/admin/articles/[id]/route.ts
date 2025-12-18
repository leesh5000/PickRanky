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

    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              include: {
                _count: {
                  select: { videos: true, clicks: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            views: true,
            shares: true,
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { article },
    });
  } catch (error) {
    console.error("Admin get article API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

interface UpdateArticleRequest {
  title?: string;
  summary?: string;
  thumbnailUrl?: string;
  category?: string;
  isActive?: boolean;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body: UpdateArticleRequest = await request.json();

    // Check if article exists
    const existingArticle = await prisma.article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.summary !== undefined) updateData.summary = body.summary?.trim() || null;
    if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl?.trim() || null;
    if (body.category !== undefined) updateData.category = body.category?.trim() || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Update article
    const article = await prisma.$transaction(async (tx) => {
      const updatedArticle = await tx.article.update({
        where: { id },
        data: updateData,
      });

      // Log admin action
      await tx.adminAction.create({
        data: {
          actionType: "UPDATE",
          targetType: "article",
          targetId: id,
          details: {
            changes: Object.keys(updateData),
          },
        },
      });

      return updatedArticle;
    });

    // Fetch updated article with relations
    const updatedArticle = await prisma.article.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        _count: {
          select: {
            views: true,
            shares: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { article: updatedArticle },
    });
  } catch (error) {
    console.error("Admin update article API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to update article: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if article exists
    const existingArticle = await prisma.article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Soft delete (set isActive to false)
    await prisma.$transaction(async (tx) => {
      await tx.article.update({
        where: { id },
        data: { isActive: false },
      });

      // Log admin action
      await tx.adminAction.create({
        data: {
          actionType: "DELETE",
          targetType: "article",
          targetId: id,
          details: {
            title: existingArticle.title,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (error) {
    console.error("Admin delete article API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete article" },
      { status: 500 }
    );
  }
}

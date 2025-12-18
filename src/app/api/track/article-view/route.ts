import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface TrackViewRequest {
  articleId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TrackViewRequest = await request.json();
    const { articleId } = body;

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: "Article ID is required" },
        { status: 400 }
      );
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Create view record
    await prisma.articleView.create({
      data: {
        articleId,
        viewedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "View tracked",
    });
  } catch (error) {
    console.error("Track article view error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track view" },
      { status: 500 }
    );
  }
}

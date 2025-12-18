import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface TrackShareRequest {
  articleId: string;
  platform?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TrackShareRequest = await request.json();
    const { articleId, platform } = body;

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

    // Create share record
    await prisma.articleShare.create({
      data: {
        articleId,
        platform: platform || null,
        sharedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Share tracked",
    });
  } catch (error) {
    console.error("Track article share error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track share" },
      { status: 500 }
    );
  }
}

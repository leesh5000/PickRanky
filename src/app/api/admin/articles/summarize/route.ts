import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchArticleContentWithRetry } from "@/lib/article/content-fetcher";
import { summarizeArticle, classifyCategory } from "@/lib/openai/client";

interface SummarizeRequest {
  url: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: SummarizeRequest = await request.json();
    const { url } = body;

    if (!url || url.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch article content
    const content = await fetchArticleContentWithRetry(url);

    if (!content || !content.content) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch article content" },
        { status: 400 }
      );
    }

    // Generate AI summary
    const summary = await summarizeArticle(content.content);

    if (!summary) {
      return NextResponse.json(
        { success: false, error: "Failed to generate summary" },
        { status: 500 }
      );
    }

    // Auto-classify category
    const category = await classifyCategory(content.title, content.content);

    return NextResponse.json({
      success: true,
      data: {
        title: content.title,
        summary,
        thumbnailUrl: content.thumbnailUrl,
        category,
        contentLength: content.content.length,
      },
    });
  } catch (error) {
    console.error("Admin summarize article API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to summarize article: ${message}` },
      { status: 500 }
    );
  }
}

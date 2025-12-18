import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ArticleSource } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const source = searchParams.get("source") as ArticleSource | null;
    const isActive = searchParams.get("isActive");
    const sortBy = searchParams.get("sortBy") || "publishedAtDesc";

    // Build filter
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category) {
      where.category = category;
    }
    if (source) {
      where.source = source;
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Build orderBy
    let orderBy: any = { publishedAt: "desc" };
    switch (sortBy) {
      case "publishedAtAsc":
        orderBy = { publishedAt: "asc" };
        break;
      case "publishedAtDesc":
        orderBy = { publishedAt: "desc" };
        break;
      case "createdAtAsc":
        orderBy = { createdAt: "asc" };
        break;
      case "createdAtDesc":
        orderBy = { createdAt: "desc" };
        break;
      case "title":
        orderBy = { title: "asc" };
        break;
      case "titleDesc":
        orderBy = { title: "desc" };
        break;
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true,
              views: true,
              shares: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        articles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin articles API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

interface CreateArticleRequest {
  title: string;
  summary?: string;
  originalUrl: string;
  thumbnailUrl?: string;
  source: ArticleSource;
  category?: string;
  publishedAt?: string;
  productIds?: string[];
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CreateArticleRequest = await request.json();
    const { title, summary, originalUrl, thumbnailUrl, source, category, publishedAt, productIds } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Article title is required" },
        { status: 400 }
      );
    }

    if (!originalUrl || originalUrl.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Original URL is required" },
        { status: 400 }
      );
    }

    if (!source || !["NAVER", "GOOGLE"].includes(source)) {
      return NextResponse.json(
        { success: false, error: "Valid source is required (NAVER or GOOGLE)" },
        { status: 400 }
      );
    }

    // Check for duplicate URL
    const existingArticle = await prisma.article.findUnique({
      where: { originalUrl: originalUrl.trim() },
    });

    if (existingArticle) {
      return NextResponse.json(
        { success: false, error: "An article with this URL already exists" },
        { status: 409 }
      );
    }

    // Create article with transaction
    const article = await prisma.$transaction(async (tx) => {
      const newArticle = await tx.article.create({
        data: {
          title: title.trim(),
          summary: summary?.trim() || null,
          originalUrl: originalUrl.trim(),
          thumbnailUrl: thumbnailUrl?.trim() || null,
          source,
          category: category?.trim() || null,
          publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
          collectedAt: new Date(),
        },
      });

      // Link products if provided
      if (productIds && productIds.length > 0) {
        await tx.articleProduct.createMany({
          data: productIds.map((productId) => ({
            articleId: newArticle.id,
            productId,
          })),
          skipDuplicates: true,
        });
      }

      // Log admin action
      await tx.adminAction.create({
        data: {
          actionType: "CREATE",
          targetType: "article",
          targetId: newArticle.id,
          details: {
            title: newArticle.title,
            source: newArticle.source,
            category: newArticle.category,
            productCount: productIds?.length || 0,
          },
        },
      });

      return newArticle;
    });

    // Fetch created article with relations
    const createdArticle = await prisma.article.findUnique({
      where: { id: article.id },
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
      data: { article: createdArticle },
    });
  } catch (error) {
    console.error("Admin create article API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to create article: ${message}` },
      { status: 500 }
    );
  }
}

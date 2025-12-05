import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where = includeInactive ? {} : { isActive: true };

    const categories = await prisma.category.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error("Admin categories API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

interface CreateCategoryRequest {
  key: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CreateCategoryRequest = await request.json();
    const { key, name, description, sortOrder } = body;

    // Validation
    if (!key || key.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Category key is required" },
        { status: 400 }
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Category name is required" },
        { status: 400 }
      );
    }

    // Key format validation (lowercase, alphanumeric, underscores)
    const keyRegex = /^[a-z][a-z0-9_]*$/;
    if (!keyRegex.test(key.trim())) {
      return NextResponse.json(
        { success: false, error: "Key must start with a letter and contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Check if category with same key exists
    const existingCategory = await prisma.category.findUnique({
      where: { key: key.trim() },
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: "A category with this key already exists" },
        { status: 409 }
      );
    }

    // Get max sortOrder if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxSortOrder = await prisma.category.aggregate({
        _max: { sortOrder: true },
      });
      finalSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        key: key.trim(),
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: finalSortOrder,
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        actionType: "CREATE",
        targetType: "category",
        targetId: category.id,
        details: {
          key: category.key,
          name: category.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    console.error("Admin create category API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to create category: ${message}` },
      { status: 500 }
    );
  }
}

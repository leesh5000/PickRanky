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

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Count products using this category
    const productCount = await prisma.product.count({
      where: { category: category.key },
    });

    return NextResponse.json({
      success: true,
      data: {
        category,
        productCount,
      },
    });
  } catch (error) {
    console.error("Admin get category API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body: UpdateCategoryRequest = await request.json();
    const { name, description, sortOrder, isActive } = body;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) {
      if (name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Category name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    if (sortOrder !== undefined) {
      updateData.sortOrder = sortOrder;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update category
    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        actionType: "UPDATE",
        targetType: "category",
        targetId: category.id,
        details: {
          key: category.key,
          changes: updateData,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    console.error("Admin update category API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to update category: ${message}` },
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

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if any products are using this category
    const productCount = await prisma.product.count({
      where: { category: existingCategory.key },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete category: ${productCount} products are using this category. Deactivate it instead.`
        },
        { status: 400 }
      );
    }

    // Delete category
    await prisma.category.delete({
      where: { id },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        actionType: "DELETE",
        targetType: "category",
        targetId: id,
        details: {
          key: existingCategory.key,
          name: existingCategory.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Category deleted successfully" },
    });
  } catch (error) {
    console.error("Admin delete category API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to delete category: ${message}` },
      { status: 500 }
    );
  }
}

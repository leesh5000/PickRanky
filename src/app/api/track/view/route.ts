import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page, productId } = body;

    if (!page) {
      return NextResponse.json(
        { success: false, error: "page is required" },
        { status: 400 }
      );
    }

    // Get referrer and user agent
    const referrer = request.headers.get("referer") || null;
    const userAgent = request.headers.get("user-agent") || null;

    await prisma.pageView.create({
      data: {
        page,
        productId: productId || null,
        referrer,
        userAgent,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("View tracking error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track view" },
      { status: 500 }
    );
  }
}

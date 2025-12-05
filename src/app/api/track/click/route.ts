import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, videoId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required" },
        { status: 400 }
      );
    }

    // Get referrer and user agent
    const referrer = request.headers.get("referer") || null;
    const userAgent = request.headers.get("user-agent") || null;

    // Hash IP for privacy
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex").substring(0, 16);

    await prisma.linkClick.create({
      data: {
        productId,
        videoId: videoId || null,
        referrer,
        userAgent,
        ipHash,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Click tracking error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track click" },
      { status: 500 }
    );
  }
}

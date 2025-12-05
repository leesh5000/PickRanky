import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchOpenGraphData } from "@/lib/opengraph";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const ogData = await fetchOpenGraphData(url);

    return NextResponse.json({
      success: true,
      data: ogData,
    });
  } catch (error: any) {
    console.error("OpenGraph API error:", error);

    // Handle Coupang blocked error
    if (error.message === "COUPANG_BLOCKED") {
      return NextResponse.json({
        success: false,
        error: "COUPANG_BLOCKED",
        message: "쿠팡은 서버 요청을 차단합니다. 상품 이미지를 직접 입력해주세요.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Failed to fetch OpenGraph data" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "news_sources_enabled";

interface NewsSourcesConfig {
  NAVER: boolean;
  GOOGLE: boolean;
}

const DEFAULT_CONFIG: NewsSourcesConfig = {
  NAVER: true,
  GOOGLE: true,
};

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
    });

    const value = config?.value as NewsSourcesConfig | null;

    return NextResponse.json({
      success: true,
      data: value || DEFAULT_CONFIG,
    });
  } catch (error) {
    console.error("Failed to fetch news sources config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { NAVER, GOOGLE } = body as Partial<NewsSourcesConfig>;

    // Validate
    if (typeof NAVER !== "boolean" || typeof GOOGLE !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Invalid config values" },
        { status: 400 }
      );
    }

    const newConfig: NewsSourcesConfig = { NAVER, GOOGLE };

    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: newConfig as unknown as Prisma.InputJsonValue },
      create: { key: CONFIG_KEY, value: newConfig as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      success: true,
      data: newConfig,
    });
  } catch (error) {
    console.error("Failed to update news sources config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update config" },
      { status: 500 }
    );
  }
}

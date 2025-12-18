import { NextResponse } from "next/server";
import { getRankingMethodDescription } from "@/lib/trends/ranking-generator";

/**
 * GET /api/trends/method
 * Public API to get ranking calculation method description
 */
export async function GET() {
  const method = getRankingMethodDescription();

  return NextResponse.json({
    success: true,
    data: method,
  });
}

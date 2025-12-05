import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Update ranking (for manual rank adjustment)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { rank, score } = body;

    const oldRanking = await prisma.productRanking.findUnique({
      where: { id: params.id },
    });

    if (!oldRanking) {
      return NextResponse.json(
        { success: false, error: "Ranking not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (rank !== undefined) updateData.rank = rank;
    if (score !== undefined) updateData.score = score;

    const ranking = await prisma.productRanking.update({
      where: { id: params.id },
      data: updateData,
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        actionType: "UPDATE_RANKING",
        targetType: "ranking",
        targetId: params.id,
        details: {
          before: oldRanking,
          after: ranking,
          changes: updateData,
        },
      },
    });

    return NextResponse.json({ success: true, data: ranking });
  } catch (error) {
    console.error("Admin ranking update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update ranking" },
      { status: 500 }
    );
  }
}

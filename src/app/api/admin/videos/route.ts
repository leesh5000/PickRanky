import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getVideoDetails, getChannelDetails } from "@/lib/youtube/client";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const productId = searchParams.get("productId");
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (productId) {
      where.productId = productId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { channelName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        include: {
          product: { select: { id: true, name: true } },
          metrics: {
            orderBy: { collectedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.video.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        videos,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin videos API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

// Manual video addition
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { youtubeUrl, productId } = body;

    if (!youtubeUrl || !productId) {
      return NextResponse.json(
        { success: false, error: "youtubeUrl and productId are required" },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const videoIdMatch = youtubeUrl.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
    );
    if (!videoIdMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    const youtubeId = videoIdMatch[1];

    // Check if video already exists
    const existing = await prisma.video.findUnique({
      where: { youtubeId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Video already exists" },
        { status: 400 }
      );
    }

    // Fetch video details from YouTube
    const videoDetails = await getVideoDetails([youtubeId]);
    if (videoDetails.length === 0) {
      return NextResponse.json(
        { success: false, error: "Video not found on YouTube" },
        { status: 404 }
      );
    }

    const video = videoDetails[0];

    // Get channel subscriber count
    const channelDetails = await getChannelDetails([video.channelId]);
    const subscriberCount =
      channelDetails.get(video.channelId)?.subscriberCount || null;

    // Parse duration
    const durationMatch = video.duration.match(
      /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
    );
    const hours = parseInt(durationMatch?.[1] || "0", 10);
    const minutes = parseInt(durationMatch?.[2] || "0", 10);
    const seconds = parseInt(durationMatch?.[3] || "0", 10);
    const durationSeconds = hours * 3600 + minutes * 60 + seconds;

    // Create video
    const newVideo = await prisma.video.create({
      data: {
        youtubeId,
        productId,
        title: video.title,
        description: video.description,
        channelId: video.channelId,
        channelName: video.channelName,
        subscriberCount,
        publishedAt: new Date(video.publishedAt),
        videoType: video.isShorts ? "SHORTS" : "REGULAR",
        thumbnailUrl: video.thumbnailUrl,
        duration: durationSeconds,
      },
    });

    // Create initial metrics
    await prisma.videoMetric.create({
      data: {
        videoId: newVideo.id,
        collectedAt: new Date(),
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        subscriberCount,
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        actionType: "ADD_VIDEO",
        targetType: "video",
        targetId: newVideo.id,
        details: { youtubeUrl, productId },
      },
    });

    return NextResponse.json({ success: true, data: newVideo });
  } catch (error) {
    console.error("Admin video add error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add video" },
      { status: 500 }
    );
  }
}

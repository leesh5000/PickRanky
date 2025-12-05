"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategoryMap } from "@/hooks/useCategories";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ScoreBreakdown } from "@/components/score-breakdown";

async function fetchProduct(id: string) {
  const res = await fetch(`/api/products/${id}`);
  return res.json();
}

async function trackClick(productId: string, videoId?: string) {
  await fetch("/api/track/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, videoId }),
  });
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const { categoryMap } = useCategoryMap();
  const { data, isLoading } = useQuery({
    queryKey: ["product", params.id],
    queryFn: () => fetchProduct(params.id),
  });

  const product = data?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">상품을 찾을 수 없습니다</h1>
            <Link href="/rankings" className="text-primary hover:underline">
              랭킹으로 돌아가기
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4">
          <Link href="/" className="hover:text-foreground">
            홈
          </Link>
          {" > "}
          <Link href="/rankings" className="hover:text-foreground">
            랭킹
          </Link>
          {" > "}
          <span>{product.name}</span>
        </nav>

        {/* Product Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div
            className={`w-full md:w-64 h-64 bg-muted rounded-lg overflow-hidden flex-shrink-0 ${
              product.productUrl ? "cursor-pointer hover:opacity-90 transition" : ""
            }`}
            onClick={() => {
              if (product.productUrl) {
                trackClick(product.id);
                window.open(product.productUrl, "_blank");
              }
            }}
          >
            {product.thumbnailUrl ? (
              <img
                src={product.thumbnailUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            {product.category && (
              <Badge variant="secondary" className="mb-4">
                {categoryMap[product.category] || product.category}
              </Badge>
            )}

            {/* Current Ranking */}
            {product.rankings && product.rankings.length > 0 && (
              <div className="bg-muted rounded-lg p-4 mb-4">
                <div className="text-sm text-muted-foreground mb-1">
                  현재 순위
                </div>
                <div className="text-3xl font-bold text-primary">
                  #{product.rankings[0].rank}
                </div>
                <div className="text-sm text-muted-foreground">
                  점수: {product.rankings[0].score.toFixed(1)}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{product.videos.length}</div>
                <div className="text-xs text-muted-foreground">관련 영상</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {formatNumber(
                    product.videos.reduce(
                      (sum: number, v: any) => sum + (v.latestMetric?.viewCount || 0),
                      0
                    )
                  )}
                </div>
                <div className="text-xs text-muted-foreground">총 조회수</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {formatNumber(
                    product.videos.reduce(
                      (sum: number, v: any) => sum + (v.latestMetric?.likeCount || 0),
                      0
                    )
                  )}
                </div>
                <div className="text-xs text-muted-foreground">총 좋아요</div>
              </div>
            </div>

            {product.productUrl && (
              <Button
                className="w-full mt-4"
                onClick={() => {
                  trackClick(product.id);
                  window.open(product.productUrl, "_blank");
                }}
              >
                상품 보러가기
              </Button>
            )}
          </div>
        </div>

        {/* Related Videos */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>관련 영상</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.videos.map((video: any) => (
                <a
                  key={video.id}
                  href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick(product.id, video.id)}
                  className="block group"
                >
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2 relative">
                    {video.thumbnailUrl ? (
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Thumbnail
                      </div>
                    )}
                    {video.videoType === "SHORTS" && (
                      <Badge className="absolute top-2 left-2" variant="destructive">
                        Shorts
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-medium line-clamp-2 group-hover:text-primary transition">
                    {video.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {video.channelName}
                  </p>
                  <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                    <span>조회수 {formatNumber(video.latestMetric?.viewCount || 0)}</span>
                    <span>·</span>
                    <span>
                      {format(new Date(video.publishedAt), "yyyy.M.d", {
                        locale: ko,
                      })}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        {product.productScoreBreakdown && (
          <ScoreBreakdown
            productScoreBreakdown={product.productScoreBreakdown}
            videos={product.videos.map((v: any) => ({
              id: v.id,
              title: v.title,
              scoreBreakdown: v.scoreBreakdown,
            }))}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

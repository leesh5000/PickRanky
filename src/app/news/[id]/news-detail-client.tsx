"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategoryMap } from "@/hooks/useCategories";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Product {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  affiliateUrl: string | null;
  price: number | null;
  originalPrice: number | null;
  discountRate: number | null;
  category: string | null;
}

interface ArticleData {
  id: string;
  title: string;
  summary: string | null;
  originalUrl: string;
  thumbnailUrl: string | null;
  source: "NAVER" | "GOOGLE";
  category: string | null;
  publishedAt: string;
  products: Product[];
  _count: {
    views: number;
    shares: number;
  };
  ranking: {
    rank: number;
    previousRank: number | null;
    score: number;
  } | null;
}

interface NewsDetailClientProps {
  initialData: ArticleData;
  articleId: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price) + "원";
}

export function NewsDetailClient({ initialData, articleId }: NewsDetailClientProps) {
  const { categoryMap } = useCategoryMap();

  // Track view on mount
  useEffect(() => {
    fetch("/api/track/article-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    }).catch(() => {});
  }, [articleId]);

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const title = initialData.title;

    // Track share
    fetch("/api/track/article-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, platform }),
    }).catch(() => {});

    // Share based on platform
    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
          "_blank"
        );
        break;
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank"
        );
        break;
      case "kakao":
        // Kakao share requires SDK setup
        if (navigator.share) {
          navigator.share({ title, url }).catch(() => {});
        }
        break;
      case "copy":
        navigator.clipboard.writeText(url);
        alert("링크가 복사되었습니다.");
        break;
    }
  };

  const handleProductClick = async (product: Product) => {
    if (product.affiliateUrl) {
      // Track product click
      fetch("/api/track/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      }).catch(() => {});

      window.open(product.affiliateUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4">
          <Link href="/" className="hover:text-foreground">
            홈
          </Link>
          <span className="mx-2">/</span>
          <Link href="/news" className="hover:text-foreground">
            기사 트렌드
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">상세</span>
        </nav>

        {/* Article Header */}
        <article className="space-y-6">
          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={initialData.source === "NAVER" ? "default" : "secondary"}>
              {initialData.source === "NAVER" ? "네이버" : "구글"}
            </Badge>
            {initialData.category && (
              <Badge variant="outline">
                {categoryMap[initialData.category] || initialData.category}
              </Badge>
            )}
            {initialData.ranking && (
              <Badge variant="outline" className="bg-primary/10">
                #{initialData.ranking.rank} (점수 {initialData.ranking.score.toFixed(1)})
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {format(new Date(initialData.publishedAt), "yyyy년 MM월 dd일 HH:mm")}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            {initialData.title}
          </h1>

          {/* Thumbnail */}
          {initialData.thumbnailUrl && (
            <div className="aspect-video max-w-2xl overflow-hidden rounded-lg">
              <img
                src={initialData.thumbnailUrl}
                alt={initialData.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Summary */}
          {initialData.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>AI 요약</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {initialData.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Original Article Link */}
          <div className="flex items-center gap-4">
            <Button asChild>
              <a href={initialData.originalUrl} target="_blank" rel="noopener noreferrer">
                원본 기사 보기
              </a>
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>조회 {initialData._count.views}</span>
              <span>|</span>
              <span>공유 {initialData._count.shares}</span>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">공유:</span>
            <Button variant="outline" size="sm" onClick={() => handleShare("twitter")}>
              X
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleShare("facebook")}>
              Facebook
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleShare("copy")}>
              링크 복사
            </Button>
          </div>
        </article>

        {/* Related Products */}
        {initialData.products.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold mb-4">연관 상품</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {initialData.products.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-lg transition"
                  onClick={() => handleProductClick(product)}
                >
                  <CardContent className="p-3">
                    {product.thumbnailUrl && (
                      <div className="aspect-square mb-2 overflow-hidden rounded">
                        <img
                          src={product.thumbnailUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    {product.price && (
                      <div className="space-y-0.5">
                        {product.discountRate && product.discountRate > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-red-500 font-bold text-sm">
                              {product.discountRate}%
                            </span>
                            {product.originalPrice && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(product.originalPrice)}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="font-bold text-sm">
                          {formatPrice(product.price)}
                        </div>
                      </div>
                    )}
                    {product.category && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {categoryMap[product.category] || product.category}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Back to List */}
        <div className="mt-8">
          <Link href="/news">
            <Button variant="outline">목록으로</Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

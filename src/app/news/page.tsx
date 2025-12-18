"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCategoryMap } from "@/hooks/useCategories";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale";

interface ArticleItem {
  id: string;
  title: string;
  summary: string | null;
  originalUrl: string;
  thumbnailUrl: string | null;
  source: "NAVER" | "GOOGLE";
  category: string | null;
  publishedAt: string;
  rank: number;
  previousRank: number | null;
  score: number;
  products: {
    id: string;
    name: string;
    thumbnailUrl: string | null;
    affiliateUrl: string | null;
  }[];
  _count: {
    views: number;
    shares: number;
  };
}

interface NewsResponse {
  success: boolean;
  data: {
    period: {
      type: string;
      startedAt: string;
      endedAt: string;
    } | null;
    articles: ArticleItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

type SourceFilter = "all" | "NAVER" | "GOOGLE";

async function fetchNews(params: {
  period: string;
  category?: string;
  source?: SourceFilter;
  page: number;
  limit: number;
}): Promise<NewsResponse> {
  const searchParams = new URLSearchParams({
    period: params.period,
    page: params.page.toString(),
    limit: params.limit.toString(),
  });

  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.source && params.source !== "all") {
    searchParams.set("source", params.source);
  }

  const res = await fetch(`/api/news?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch news");
  return res.json();
}

function getRankChange(rank: number, previousRank: number | null) {
  if (previousRank === null || previousRank === 0) {
    return { type: "NEW" as const, value: null, label: "NEW" };
  }
  const change = previousRank - rank;
  if (change > 0) return { type: "UP" as const, value: change, label: `+${change}` };
  if (change < 0) return { type: "DOWN" as const, value: Math.abs(change), label: `${change}` };
  return { type: "SAME" as const, value: 0, label: "-" };
}

function RankBadge({ type, label }: { type: "UP" | "DOWN" | "SAME" | "NEW"; label: string }) {
  if (type === "NEW") {
    return <Badge className="bg-blue-500 text-white text-[10px] px-1">NEW</Badge>;
  }
  if (type === "UP") {
    return <span className="text-green-500 text-xs font-medium">{label}</span>;
  }
  if (type === "DOWN") {
    return <span className="text-red-500 text-xs font-medium">{label}</span>;
  }
  return <span className="text-gray-400 text-xs">-</span>;
}

export default function NewsPage() {
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [category, setCategory] = useState<string | undefined>();
  const [source, setSource] = useState<SourceFilter>("all");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const { categoryMap } = useCategoryMap();
  const observerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["news", period, category, source],
    queryFn: ({ pageParam = 1 }) =>
      fetchNews({
        period,
        category,
        source,
        page: pageParam,
        limit: 20,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  const allArticles = data?.pages.flatMap((page) => page.data.articles) || [];
  const periodInfo = data?.pages[0]?.data.period;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">기사 트렌드</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            AI가 요약한 쇼핑 트렌드 기사 랭킹
          </p>
          {periodInfo && (
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(periodInfo.startedAt), "yyyy년 MM월 dd일")} 기준
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* Period Toggle */}
          <div className="flex gap-2">
            <Button
              variant={period === "daily" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("daily")}
            >
              일별
            </Button>
            <Button
              variant={period === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("monthly")}
            >
              월별
            </Button>
          </div>

          {/* Source Filter */}
          <div className="flex gap-2">
            <Button
              variant={source === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSource("all")}
            >
              전체
            </Button>
            <Button
              variant={source === "NAVER" ? "default" : "outline"}
              size="sm"
              onClick={() => setSource("NAVER")}
            >
              네이버
            </Button>
            <Button
              variant={source === "GOOGLE" ? "default" : "outline"}
              size="sm"
              onClick={() => setSource("GOOGLE")}
            >
              구글
            </Button>
          </div>

          {/* Category Filter (Collapsible on mobile) */}
          <div className="sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="w-full justify-between"
            >
              카테고리: {category ? categoryMap[category] || category : "전체"}
              <span>{isCategoryOpen ? "▲" : "▼"}</span>
            </Button>
            {isCategoryOpen && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant={!category ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCategory(undefined);
                    setIsCategoryOpen(false);
                  }}
                >
                  전체
                </Button>
                {Object.entries(categoryMap).map(([key, name]) => (
                  <Button
                    key={key}
                    variant={category === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setCategory(key);
                      setIsCategoryOpen(false);
                    }}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Category Filter (Desktop) */}
          <div className="hidden sm:flex flex-wrap gap-2">
            <Button
              variant={!category ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(undefined)}
            >
              전체
            </Button>
            {Object.entries(categoryMap).map(([key, name]) => (
              <Button
                key={key}
                variant={category === key ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(key)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="text-center py-12 text-red-500">
            기사를 불러오는데 실패했습니다.
          </div>
        )}

        {/* Articles List */}
        {!isLoading && !isError && (
          <div className="space-y-4">
            {allArticles.map((article) => {
              const change = getRankChange(article.rank, article.previousRank);

              return (
                <Card key={article.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Rank */}
                      <div className="flex flex-col items-center justify-start min-w-[40px]">
                        <span className="text-2xl font-bold text-primary">
                          {article.rank}
                        </span>
                        <RankBadge type={change.type} label={change.label} />
                      </div>

                      {/* Thumbnail */}
                      {article.thumbnailUrl && (
                        <div className="hidden sm:block w-24 h-16 flex-shrink-0">
                          <img
                            src={article.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={article.source === "NAVER" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {article.source === "NAVER" ? "네이버" : "구글"}
                          </Badge>
                          {article.category && (
                            <Badge variant="outline" className="text-[10px]">
                              {categoryMap[article.category] || article.category}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(article.publishedAt), {
                              addSuffix: true,
                              locale: ko,
                            })}
                          </span>
                        </div>

                        <Link href={`/news/${article.id}`}>
                          <h3 className="font-medium line-clamp-2 hover:text-primary transition">
                            {article.title}
                          </h3>
                        </Link>

                        {article.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {article.summary}
                          </p>
                        )}

                        {/* Stats & Products */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>조회 {article._count.views}</span>
                            <span>공유 {article._count.shares}</span>
                            {article.score > 0 && (
                              <span className="text-primary font-medium">
                                점수 {article.score.toFixed(1)}
                              </span>
                            )}
                          </div>

                          {article.products.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1">
                              {article.products.slice(0, 3).map((product) => (
                                <div
                                  key={product.id}
                                  className="w-6 h-6 rounded overflow-hidden"
                                  title={product.name}
                                >
                                  {product.thumbnailUrl && (
                                    <img
                                      src={product.thumbnailUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                              ))}
                              {article.products.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{article.products.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Empty State */}
            {allArticles.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                등록된 기사가 없습니다.
              </div>
            )}

            {/* Infinite Scroll Observer */}
            <div ref={observerRef} className="h-4" />

            {/* Loading More */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

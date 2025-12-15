"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CategoryClientProps {
  categoryKey: string;
  categoryLabel: string;
}

async function fetchRankings(category: string, page: number) {
  const searchParams = new URLSearchParams({
    period: "daily",
    category,
    page: page.toString(),
    limit: "20",
  });

  const res = await fetch(`/api/rankings?${searchParams}`);
  return res.json();
}

export function CategoryClient({
  categoryKey,
  categoryLabel,
}: CategoryClientProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["rankings", categoryKey, page],
    queryFn: () => fetchRankings(categoryKey, page),
  });

  const rankings = data?.data?.rankings || [];
  const pagination = data?.data?.pagination;

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        {" > "}
        <Link href="/categories" className="hover:text-foreground">
          카테고리
        </Link>
        {" > "}
        <span>{categoryLabel}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-6">{categoryLabel} 랭킹</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          이 카테고리에는 아직 상품이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {rankings.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <Link
                  href={`/products/${item.product.id}`}
                  className="flex items-center gap-4"
                >
                  {/* Rank */}
                  <div className="flex flex-col items-center w-12">
                    <span className="text-2xl font-bold">{item.rank}</span>
                    <RankChangeIndicator change={item.change} />
                  </div>

                  {/* Thumbnail */}
                  <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {item.product.thumbnailUrl ? (
                      <Image
                        src={item.product.thumbnailUrl}
                        alt={item.product.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.product.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      영상 {item.videoCount}개
                    </span>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {item.score.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">점수</div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            이전
          </Button>
          <span className="flex items-center px-4">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </main>
  );
}

function RankChangeIndicator({
  change,
}: {
  change: { type: string; value: number | null; label: string };
}) {
  if (change.type === "NEW") {
    return (
      <Badge variant="success" className="text-xs">
        NEW
      </Badge>
    );
  }
  if (change.type === "UP") {
    return (
      <span className="text-green-500 text-xs font-medium">
        ▲{change.value}
      </span>
    );
  }
  if (change.type === "DOWN") {
    return (
      <span className="text-red-500 text-xs font-medium">▼{change.value}</span>
    );
  }
  return <span className="text-muted-foreground text-xs">-</span>;
}

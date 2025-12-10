"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RankingItem {
  id: string;
  rank: number;
  score: number;
  product: {
    id: string;
    name: string;
    thumbnailUrl: string | null;
    affiliateUrl: string | null;
    price: number | null;
    originalPrice: number | null;
    discountRate: number | null;
  };
}

async function fetchPopularProducts() {
  const res = await fetch("/api/rankings?period=daily&limit=5");
  const data = await res.json();
  return data.data?.rankings || [];
}

function trackClick(productId: string) {
  fetch("/api/track/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
}

export function PopularProductsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { data: rankings = [], isLoading } = useQuery<RankingItem[]>({
    queryKey: ["popularProducts", "daily"],
    queryFn: fetchPopularProducts,
    staleTime: 5 * 60 * 1000,
  });

  // 자동 슬라이드
  useEffect(() => {
    if (isPaused || rankings.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % rankings.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [isPaused, rankings.length]);

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + rankings.length) % rankings.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % rankings.length);
  };

  const handleProductClick = (productId: string, affiliateUrl: string | null) => {
    if (!affiliateUrl) return;
    trackClick(productId);
    window.open(affiliateUrl, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-muted rounded-xl animate-pulse" />
    );
  }

  if (rankings.length === 0) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 슬라이드 컨테이너 */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {rankings.map((item) => (
          <div
            key={item.id}
            className="w-full flex-shrink-0 cursor-pointer"
            onClick={() => handleProductClick(item.product.id, item.product.affiliateUrl)}
          >
            <div className="relative aspect-[16/9] sm:aspect-[21/9]">
              {/* 썸네일 이미지 */}
              {item.product.thumbnailUrl ? (
                <img
                  src={item.product.thumbnailUrl}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                  No Image
                </div>
              )}

              {/* 그라데이션 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* 콘텐츠 */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                <Badge className="bg-primary hover:bg-primary mb-2">
                  #{item.rank} 인기
                </Badge>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold line-clamp-2 mb-2">
                  {item.product.name}
                </h3>
                {item.product.price && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    {item.product.discountRate && (
                      <span className="text-red-400 font-bold text-base sm:text-lg">
                        {item.product.discountRate}%
                      </span>
                    )}
                    {item.product.originalPrice && item.product.originalPrice !== item.product.price && (
                      <span className="text-white/60 line-through text-sm sm:text-base">
                        {item.product.originalPrice.toLocaleString()}원
                      </span>
                    )}
                    <span className="text-lg sm:text-xl font-bold">
                      {item.product.price.toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 좌우 화살표 (데스크톱만) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goToPrev();
        }}
        className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
        aria-label="이전"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          goToNext();
        }}
        className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
        aria-label="다음"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* 도트 인디케이터 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        {rankings.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(index);
            }}
            className={`w-2 h-2 rounded-full transition ${
              index === currentIndex ? "bg-white" : "bg-white/50"
            }`}
            aria-label={`슬라이드 ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

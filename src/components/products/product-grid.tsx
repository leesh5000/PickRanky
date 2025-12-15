"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductItem {
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

interface ProductGridProps {
  apiUrl: string;
  queryKey: string;
  itemsPerPage?: number;
  rotationInterval?: number;
}

async function fetchProducts(apiUrl: string) {
  const res = await fetch(apiUrl);
  const data = await res.json();
  return data.data?.products || data.data?.rankings || [];
}

function trackClick(productId: string) {
  fetch("/api/track/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
}

export function ProductGrid({
  apiUrl,
  queryKey,
  itemsPerPage = 5,
  rotationInterval = 5000,
}: ProductGridProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: products = [], isLoading } = useQuery<ProductItem[]>({
    queryKey: [queryKey],
    queryFn: () => fetchProducts(apiUrl),
    staleTime: 5 * 60 * 1000,
  });

  // 페이지 수 계산
  const totalPages = Math.ceil(products.length / itemsPerPage);

  // 자동 로테이션
  useEffect(() => {
    if (isPaused || totalPages <= 1) return;

    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, rotationInterval);

    return () => clearInterval(timer);
  }, [isPaused, totalPages, rotationInterval]);

  const goToPrev = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const goToNext = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const handleProductClick = (
    productId: string,
    affiliateUrl: string | null
  ) => {
    if (!affiliateUrl) return;
    trackClick(productId);
    window.open(affiliateUrl, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(itemsPerPage)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[4/3] bg-muted rounded-lg mb-2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        등록된 상품이 없습니다.
      </p>
    );
  }

  // 페이지별로 상품 그룹화
  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(products.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 슬라이드 컨테이너 */}
      <div className="overflow-hidden" ref={containerRef}>
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentPage * 100}%)` }}
        >
          {pages.map((pageProducts, pageIndex) => (
            <div
              key={pageIndex}
              className="w-full flex-shrink-0"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {pageProducts.map((item) => (
                  <div
                    key={item.id}
                    className="group cursor-pointer"
                    onClick={() =>
                      handleProductClick(item.product.id, item.product.affiliateUrl)
                    }
                  >
                    {/* 썸네일 */}
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted mb-2 border group-hover:border-primary/50 transition">
                      {item.product.thumbnailUrl ? (
                        <img
                          src={item.product.thumbnailUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* 상품명 */}
                    <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition">
                      {item.product.name}
                    </h3>

                    {/* 가격 정보 */}
                    {item.product.price && (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {item.product.discountRate && (
                          <span className="text-red-500 font-bold text-sm">
                            {item.product.discountRate}%
                          </span>
                        )}
                        <span className="font-semibold text-sm">
                          {item.product.price.toLocaleString()}원
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 네비게이션 (페이지가 2개 이상일 때만 표시) */}
      {totalPages > 1 && (
        <>
          {/* 좌우 버튼 */}
          <button
            onClick={goToPrev}
            className="absolute -left-3 top-1/3 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-background border shadow-sm hover:bg-muted transition z-10"
            aria-label="이전"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNext}
            className="absolute -right-3 top-1/3 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-background border shadow-sm hover:bg-muted transition z-10"
            aria-label="다음"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* 페이지 인디케이터 */}
          <div className="flex justify-center gap-1.5 mt-4">
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-2 h-2 rounded-full transition ${
                  index === currentPage
                    ? "bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`페이지 ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

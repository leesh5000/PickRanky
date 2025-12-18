"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCategories } from "@/hooks/useCategories";

interface SummarizeResponse {
  success: boolean;
  data?: {
    title: string;
    summary: string;
    thumbnailUrl: string | null;
    category: string | null;
  };
  error?: string;
}

interface Product {
  id: string;
  name: string;
  category: string | null;
  thumbnailUrl: string | null;
  _count: {
    videos: number;
    clicks: number;
  };
}

async function summarizeUrl(url: string): Promise<SummarizeResponse> {
  const res = await fetch("/api/admin/articles/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

async function createArticle(data: {
  title: string;
  summary: string;
  originalUrl: string;
  thumbnailUrl: string | null;
  source: "NAVER" | "GOOGLE";
  category: string | null;
  productIds: string[];
}) {
  const res = await fetch("/api/admin/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function fetchProducts(category?: string): Promise<{ data: { products: Product[] } }> {
  const params = new URLSearchParams({ limit: "50" });
  if (category) params.set("category", category);
  const res = await fetch(`/api/admin/products?${params}`);
  return res.json();
}

export default function NewArticlePage() {
  const router = useRouter();
  const { data: categories = [] } = useCategories();

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [source, setSource] = useState<"NAVER" | "GOOGLE">("NAVER");
  const [category, setCategory] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const { data: productsData } = useQuery({
    queryKey: ["admin-products-for-article", category],
    queryFn: () => fetchProducts(category || undefined),
    enabled: true,
  });
  const products = productsData?.data?.products || [];

  const summarizeMutation = useMutation({
    mutationFn: summarizeUrl,
    onSuccess: (data) => {
      if (data.success && data.data) {
        setTitle(data.data.title);
        setSummary(data.data.summary);
        if (data.data.thumbnailUrl) setThumbnailUrl(data.data.thumbnailUrl);
        if (data.data.category) setCategory(data.data.category);

        // Auto-detect source from URL
        if (url.includes("naver.com")) {
          setSource("NAVER");
        } else if (url.includes("google.com") || url.includes("news.google")) {
          setSource("GOOGLE");
        }
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: createArticle,
    onSuccess: (data) => {
      if (data.success) {
        router.push("/admin/articles");
      }
    },
  });

  const handleSummarize = () => {
    if (!url.trim()) return;
    summarizeMutation.mutate(url.trim());
  };

  const handleSubmit = () => {
    if (!title.trim() || !url.trim()) return;

    createMutation.mutate({
      title: title.trim(),
      summary: summary.trim(),
      originalUrl: url.trim(),
      thumbnailUrl: thumbnailUrl.trim() || null,
      source,
      category: category || null,
      productIds: selectedProducts,
    });
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const isValid = title.trim() && url.trim();

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">새 기사 등록</h1>

      <Card>
        <CardHeader>
          <CardTitle>기사 URL 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://news.naver.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSummarize}
              disabled={!url.trim() || summarizeMutation.isPending}
            >
              {summarizeMutation.isPending ? "분석 중..." : "AI 요약 생성"}
            </Button>
          </div>
          {summarizeMutation.isError && (
            <p className="text-sm text-red-500">
              기사 분석에 실패했습니다. URL을 확인해주세요.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>기사 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">제목 *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="기사 제목"
            />
          </div>

          <div>
            <label className="text-sm font-medium">AI 요약</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="기사 요약 내용"
              rows={4}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">썸네일 URL</label>
            <Input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
            />
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt="썸네일 미리보기"
                className="mt-2 w-32 h-20 object-cover rounded"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">소스</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as "NAVER" | "GOOGLE")}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="NAVER">네이버</option>
                <option value="GOOGLE">구글</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">선택 안함</option>
                {categories.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>연관 상품 선택 ({selectedProducts.length}개 선택됨)</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {category ? "해당 카테고리에 등록된 상품이 없습니다." : "카테고리를 선택하면 해당 카테고리의 상품이 표시됩니다."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {products.map((product) => (
                <label
                  key={product.id}
                  className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50 ${
                    selectedProducts.includes(product.id) ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="rounded"
                  />
                  {product.thumbnailUrl && (
                    <img
                      src={product.thumbnailUrl}
                      alt=""
                      className="w-8 h-8 object-cover rounded"
                    />
                  )}
                  <span className="text-sm truncate">{product.name}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || createMutation.isPending}
        >
          {createMutation.isPending ? "등록 중..." : "기사 등록"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          취소
        </Button>
      </div>

      {createMutation.isError && (
        <p className="text-sm text-red-500">기사 등록에 실패했습니다.</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategories } from "@/hooks/useCategories";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type SortOption = "publishedAtDesc" | "publishedAtAsc" | "createdAtDesc" | "createdAtAsc" | "title" | "titleDesc";
type SourceFilter = "NAVER" | "GOOGLE" | undefined;

interface Article {
  id: string;
  title: string;
  summary: string | null;
  originalUrl: string;
  thumbnailUrl: string | null;
  source: "NAVER" | "GOOGLE";
  category: string | null;
  publishedAt: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    products: number;
    views: number;
    shares: number;
  };
}

interface ArticlesResponse {
  success: boolean;
  data: {
    articles: Article[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

async function fetchArticles(params: {
  page: number;
  search: string;
  category?: string;
  source?: SourceFilter;
  sortBy: SortOption;
}): Promise<ArticlesResponse> {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    limit: "20",
    sortBy: params.sortBy,
  });

  if (params.search) searchParams.set("search", params.search);
  if (params.category) searchParams.set("category", params.category);
  if (params.source) searchParams.set("source", params.source);

  const res = await fetch(`/api/admin/articles?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch articles");
  return res.json();
}

export default function AdminArticlesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [source, setSource] = useState<SourceFilter>();
  const [sortBy, setSortBy] = useState<SortOption>("publishedAtDesc");

  const { data: categories = [] } = useCategories();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-articles", page, search, category, source, sortBy],
    queryFn: () => fetchArticles({ page, search, category, source, sortBy }),
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (cat: string | undefined) => {
    setCategory(cat);
    setPage(1);
  };

  const handleSourceChange = (src: SourceFilter) => {
    setSource(src);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">기사 관리</h1>
        <Link href="/admin/articles/new">
          <Button>새 기사 등록</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>검색 및 필터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="기사 제목 검색..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-md"
          />

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">소스:</span>
            <Button
              variant={source === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => handleSourceChange(undefined)}
            >
              전체
            </Button>
            <Button
              variant={source === "NAVER" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSourceChange("NAVER")}
            >
              네이버
            </Button>
            <Button
              variant={source === "GOOGLE" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSourceChange("GOOGLE")}
            >
              구글
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">카테고리:</span>
            <Button
              variant={category === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(undefined)}
            >
              전체
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.key}
                variant={category === cat.key ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(cat.key)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">정렬:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="publishedAtDesc">발행일 최신순</option>
              <option value="publishedAtAsc">발행일 오래된순</option>
              <option value="createdAtDesc">등록일 최신순</option>
              <option value="createdAtAsc">등록일 오래된순</option>
              <option value="title">제목 가나다순</option>
              <option value="titleDesc">제목 역순</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          기사를 불러오는데 실패했습니다.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-3 px-2 font-medium">기사</th>
                  <th className="py-3 px-2 font-medium">소스</th>
                  <th className="py-3 px-2 font-medium">카테고리</th>
                  <th className="py-3 px-2 font-medium text-center">조회</th>
                  <th className="py-3 px-2 font-medium text-center">공유</th>
                  <th className="py-3 px-2 font-medium text-center">상품</th>
                  <th className="py-3 px-2 font-medium">발행일</th>
                  <th className="py-3 px-2 font-medium">상태</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.data.articles.map((article) => (
                  <tr key={article.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {article.thumbnailUrl && (
                          <img
                            src={article.thumbnailUrl}
                            alt=""
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-xs">
                            {article.title}
                          </div>
                          {article.summary && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {article.summary}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={article.source === "NAVER" ? "default" : "secondary"}>
                        {article.source === "NAVER" ? "네이버" : "구글"}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      {article.category ? (
                        <Badge variant="outline">
                          {categories.find((c) => c.key === article.category)?.name || article.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">{article._count.views}</td>
                    <td className="py-3 px-2 text-center">{article._count.shares}</td>
                    <td className="py-3 px-2 text-center">{article._count.products}</td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(article.publishedAt), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={article.isActive ? "success" : "secondary"}>
                        {article.isActive ? "활성" : "비활성"}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      <Link href={`/admin/articles/${article.id}`}>
                        <Button variant="outline" size="sm">
                          편집
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data?.data.articles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              등록된 기사가 없습니다.
            </div>
          )}

          {data && data.data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {data.data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === data.data.pagination.totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

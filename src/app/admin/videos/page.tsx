"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

async function fetchVideos(params: { page: number; search?: string }) {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    limit: "20",
  });
  if (params.search) searchParams.set("search", params.search);

  const res = await fetch(`/api/admin/videos?${searchParams}`);
  return res.json();
}

async function addVideo(data: { youtubeUrl: string; productId: string }) {
  const res = await fetch("/api/admin/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export default function AdminVideosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newProductId, setNewProductId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-videos", page, search],
    queryFn: () => fetchVideos({ page, search }),
  });

  const addMutation = useMutation({
    mutationFn: addVideo,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
        setShowAddForm(false);
        setNewVideoUrl("");
        setNewProductId("");
        alert("영상이 추가되었습니다.");
      } else {
        alert(data.error || "추가 실패");
      }
    },
  });

  const videos = data?.data?.videos || [];
  const pagination = data?.data?.pagination;

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({ youtubeUrl: newVideoUrl, productId: newProductId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">영상 관리</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "취소" : "영상 추가"}
        </Button>
      </div>

      {/* Add Video Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>영상 수동 추가</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddVideo} className="space-y-4">
              <div>
                <label className="text-sm font-medium">YouTube URL</label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">상품 ID</label>
                <Input
                  placeholder="연결할 상품 ID"
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "추가 중..." : "추가"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="영상 또는 채널 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      {/* Videos Table */}
      <Card>
        <CardHeader>
          <CardTitle>영상 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : videos.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              영상이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">제목</th>
                    <th className="text-left py-3 px-2">채널</th>
                    <th className="text-left py-3 px-2">상품</th>
                    <th className="text-center py-3 px-2">조회수</th>
                    <th className="text-center py-3 px-2">타입</th>
                    <th className="text-center py-3 px-2">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video: any) => (
                    <tr key={video.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <a
                          href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary max-w-xs truncate block"
                        >
                          {video.title}
                        </a>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {video.channelName}
                      </td>
                      <td className="py-3 px-2 text-sm">
                        {video.product?.name || "-"}
                      </td>
                      <td className="py-3 px-2 text-center text-sm">
                        {formatNumber(video.metrics?.[0]?.viewCount || 0)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          variant={
                            video.videoType === "SHORTS"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {video.videoType}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center text-sm text-muted-foreground">
                        {format(new Date(video.createdAt), "MM/dd", {
                          locale: ko,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
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
        </CardContent>
      </Card>
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

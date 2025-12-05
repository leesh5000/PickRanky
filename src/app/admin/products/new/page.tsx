"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCategories } from "@/hooks/useCategories";

interface VideoResult {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: number;
  isShorts: boolean;
  subscriberCount: number | null;
  previewScore: number;
}

interface ExistingVideo {
  id: string;
  youtubeId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string | null;
  videoType: string;
  isActive: boolean;
  metrics?: { viewCount: number; likeCount: number }[];
}

interface ProductFormData {
  name: string;
  category: string;
  affiliateUrl: string;
  productUrl: string;
  thumbnailUrls: string[];
  isActive: boolean;
}

async function fetchProduct(id: string) {
  const res = await fetch(`/api/admin/products/${id}`);
  return res.json();
}

async function searchYouTubeVideos(params: {
  query: string;
  maxResults: number;
  order: string;
  publishedAfter: string;
}) {
  const res = await fetch("/api/admin/youtube/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}

async function createProduct(data: {
  name: string;
  category: string;
  affiliateUrl: string;
  productUrl?: string;
  thumbnailUrls?: string[];
  videos: VideoResult[];
}) {
  const payload = {
    ...data,
    thumbnailUrl: data.thumbnailUrls?.[0] || undefined,
    videos: data.videos.map((v) => ({
      youtubeId: v.videoId,
      title: v.title,
      description: v.description,
      channelId: v.channelId,
      channelName: v.channelName,
      thumbnailUrl: v.thumbnailUrl,
      publishedAt: v.publishedAt,
      viewCount: v.viewCount,
      likeCount: v.likeCount,
      commentCount: v.commentCount,
      duration: v.duration,
      isShorts: v.isShorts,
      subscriberCount: v.subscriberCount,
    })),
  };

  const res = await fetch("/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function updateProduct(id: string, data: any) {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function deleteProduct(id: string) {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

async function addVideoToProduct(productId: string, video: VideoResult) {
  const res = await fetch(`/api/admin/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId,
      youtubeId: video.videoId,
      title: video.title,
      description: video.description,
      channelId: video.channelId,
      channelName: video.channelName,
      thumbnailUrl: video.thumbnailUrl,
      publishedAt: video.publishedAt,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      commentCount: video.commentCount,
      duration: video.duration,
      isShorts: video.isShorts,
      subscriberCount: video.subscriberCount,
    }),
  });
  return res.json();
}

async function updateVideo(videoId: string, data: any) {
  const res = await fetch(`/api/admin/videos/${videoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function deleteVideo(videoId: string) {
  const res = await fetch(`/api/admin/videos/${videoId}`, {
    method: "DELETE",
  });
  return res.json();
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

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function AdminProductFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const productId = searchParams.get("id");
  const isEditMode = !!productId;

  const { data: categories, isLoading: categoriesLoading } = useCategories();

  // Fetch existing product if editing
  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ["admin-product", productId],
    queryFn: () => fetchProduct(productId!),
    enabled: isEditMode,
  });

  const existingProduct = productData?.data;

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    category: "",
    affiliateUrl: "",
    productUrl: "",
    thumbnailUrls: [],
    isActive: true,
  });

  // New thumbnail input state
  const [newThumbnailUrl, setNewThumbnailUrl] = useState("");

  // Initialize form with existing product data
  useEffect(() => {
    if (existingProduct) {
      // Convert thumbnailUrls from database (could be JSON or array)
      let thumbnails: string[] = [];
      if (Array.isArray(existingProduct.thumbnailUrls)) {
        thumbnails = existingProduct.thumbnailUrls;
      } else if (existingProduct.thumbnailUrl) {
        thumbnails = [existingProduct.thumbnailUrl];
      }

      setFormData({
        name: existingProduct.name || "",
        category: existingProduct.category || "",
        affiliateUrl: existingProduct.affiliateUrl || "",
        productUrl: existingProduct.productUrl || "",
        thumbnailUrls: thumbnails,
        isActive: existingProduct.isActive ?? true,
      });
    }
  }, [existingProduct]);

  // Add thumbnail
  const handleAddThumbnail = () => {
    if (newThumbnailUrl.trim() && !formData.thumbnailUrls.includes(newThumbnailUrl.trim())) {
      setFormData({
        ...formData,
        thumbnailUrls: [...formData.thumbnailUrls, newThumbnailUrl.trim()],
      });
      setNewThumbnailUrl("");
    }
  };

  // Remove thumbnail
  const handleRemoveThumbnail = (index: number) => {
    setFormData({
      ...formData,
      thumbnailUrls: formData.thumbnailUrls.filter((_, i) => i !== index),
    });
  };

  // Move thumbnail up/down
  const handleMoveThumbnail = (index: number, direction: "up" | "down") => {
    const newUrls = [...formData.thumbnailUrls];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newUrls.length) {
      [newUrls[index], newUrls[newIndex]] = [newUrls[newIndex], newUrls[index]];
      setFormData({ ...formData, thumbnailUrls: newUrls });
    }
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [order, setOrder] = useState<"relevance" | "viewCount" | "date">("viewCount");
  const [publishedAfter, setPublishedAfter] = useState("30d");

  // Results state
  const [searchResults, setSearchResults] = useState<VideoResult[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Existing videos (for edit mode)
  const existingVideos: ExistingVideo[] = existingProduct?.videos || [];

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError("");
    setSearchResults([]);
    setSelectedVideos(new Set());

    try {
      const result = await searchYouTubeVideos({
        query: searchQuery.trim(),
        maxResults,
        order,
        publishedAfter,
      });

      if (result.success) {
        // Filter out already existing videos
        const existingYoutubeIds = new Set(existingVideos.map((v) => v.youtubeId));
        const filteredResults = result.data.videos.filter(
          (v: VideoResult) => !existingYoutubeIds.has(v.videoId)
        );
        setSearchResults(filteredResults);
        if (filteredResults.length === 0) {
          setSearchError(
            result.data.videos.length > 0
              ? "모든 검색 결과가 이미 추가된 영상입니다."
              : "검색 결과가 없습니다."
          );
        }
      } else {
        setSearchError(result.error || "검색에 실패했습니다.");
      }
    } catch (error) {
      setSearchError("검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle video selection
  const toggleVideoSelection = (videoId: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideos(newSelected);
  };

  const selectAll = () => {
    setSelectedVideos(new Set(searchResults.map((v) => v.videoId)));
  };

  const deselectAll = () => {
    setSelectedVideos(new Set());
  };

  const getSelectedVideos = (): VideoResult[] => {
    return searchResults.filter((v) => selectedVideos.has(v.videoId));
  };

  // Calculate estimated product score
  const calculateEstimatedScore = (): number => {
    const selected = getSelectedVideos();
    if (selected.length === 0) return 0;

    const weights = [1.0, 0.7, 0.5, 0.35, 0.25];
    const sorted = [...selected].sort((a, b) => b.previewScore - a.previewScore);
    const top5 = sorted.slice(0, 5);

    let weightedSum = 0;
    let totalWeight = 0;

    top5.forEach((video, index) => {
      const weight = weights[index] || 0.2;
      weightedSum += video.previewScore * weight;
      totalWeight += weight;
    });

    const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const countBonus = Math.min(5, Math.log2(selected.length + 1) * 2);

    return Math.min(100, Math.round((weightedAvg + countBonus) * 100) / 100);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => {
      const selected = getSelectedVideos();
      return createProduct({
        name: formData.name.trim(),
        category: formData.category,
        affiliateUrl: formData.affiliateUrl.trim(),
        productUrl: formData.productUrl.trim() || undefined,
        thumbnailUrls: formData.thumbnailUrls.length > 0 ? formData.thumbnailUrls : undefined,
        videos: selected,
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        alert(`상품이 등록되었습니다!\n점수: ${result.data.score}점`);
        router.push("/admin/products");
      } else {
        alert(result.error || "상품 등록에 실패했습니다.");
      }
    },
    onError: () => {
      alert("상품 등록 중 오류가 발생했습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateProduct(productId!, formData),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-product", productId] });
        alert("저장되었습니다.");
      } else {
        alert(result.error || "저장에 실패했습니다.");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(productId!),
    onSuccess: () => {
      router.push("/admin/products");
    },
  });

  const addVideoMutation = useMutation({
    mutationFn: (video: VideoResult) => addVideoToProduct(productId!, video),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-product", productId] });
        setSearchResults((prev) =>
          prev.filter((v) => v.videoId !== result.data?.video?.youtubeId)
        );
        setSelectedVideos((prev) => {
          const newSet = new Set(prev);
          newSet.delete(result.data?.video?.youtubeId);
          return newSet;
        });
      } else {
        alert(result.error || "영상 추가에 실패했습니다.");
      }
    },
  });

  const toggleVideoMutation = useMutation({
    mutationFn: ({ videoId, isActive }: { videoId: string; isActive: boolean }) =>
      updateVideo(videoId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product", productId] });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (videoId: string) => deleteVideo(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product", productId] });
    },
  });

  // Add selected videos (for edit mode)
  const handleAddSelectedVideos = async () => {
    const selected = getSelectedVideos();
    for (const video of selected) {
      await addVideoMutation.mutateAsync(video);
    }
    setSelectedVideos(new Set());
  };

  // Form validation
  const isFormValid = isEditMode
    ? formData.name.trim() && formData.category
    : formData.name.trim() &&
      formData.category &&
      formData.affiliateUrl.trim() &&
      selectedVideos.size > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (isEditMode) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (confirm("정말로 이 상품을 비활성화 하시겠습니까?")) {
      deleteMutation.mutate();
    }
  };

  if (isEditMode && productLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          대시보드
        </Link>
        {" > "}
        <Link href="/admin/products" className="hover:text-foreground">
          상품 관리
        </Link>
        {" > "}
        <span>{isEditMode ? "상품 편집" : "상품 등록"}</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {isEditMode ? "상품 편집" : "상품 등록"}
        </h1>
        {isEditMode && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            비활성화
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Product Info & Search */}
          <div className="space-y-6">
            {/* Section 1: Product Information */}
            <Card>
              <CardHeader>
                <CardTitle>1. 상품 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    상품명 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="상품명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    카테고리 <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    disabled={categoriesLoading}
                  >
                    <option value="">카테고리 선택</option>
                    {categories?.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    제휴 링크 {!isEditMode && <span className="text-destructive">*</span>}
                  </label>
                  <Input
                    value={formData.affiliateUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, affiliateUrl: e.target.value })
                    }
                    placeholder="제휴 링크 URL"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">상품 URL (선택)</label>
                  <Input
                    value={formData.productUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, productUrl: e.target.value })
                    }
                    placeholder="상품 페이지 URL"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">썸네일 이미지 (선택)</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    여러 개의 썸네일을 추가할 수 있습니다. 첫 번째 이미지가 대표 썸네일로 사용됩니다.
                  </p>

                  {/* Add new thumbnail */}
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newThumbnailUrl}
                      onChange={(e) => setNewThumbnailUrl(e.target.value)}
                      placeholder="썸네일 URL 입력"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddThumbnail();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddThumbnail}
                      disabled={!newThumbnailUrl.trim()}
                    >
                      추가
                    </Button>
                  </div>

                  {/* Thumbnail list */}
                  {formData.thumbnailUrls.length > 0 ? (
                    <div className="space-y-2">
                      {formData.thumbnailUrls.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30"
                        >
                          <img
                            src={url}
                            alt={`썸네일 ${index + 1}`}
                            className="w-16 h-16 object-cover rounded border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.png";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{url}</p>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs mt-1">
                                대표
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleMoveThumbnail(index, "up")}
                              disabled={index === 0}
                              title="위로 이동"
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleMoveThumbnail(index, "down")}
                              disabled={index === formData.thumbnailUrls.length - 1}
                              title="아래로 이동"
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveThumbnail(index)}
                              title="삭제"
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                      썸네일이 없으면 첫 번째 영상의 썸네일이 사용됩니다.
                    </p>
                  )}
                </div>

                {isEditMode && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium">
                      활성화
                    </label>
                  </div>
                )}

                {isEditMode && (
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="w-full"
                  >
                    {updateMutation.isPending ? "저장 중..." : "상품 정보 저장"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Section 2: YouTube Search */}
            <Card>
              <CardHeader>
                <CardTitle>2. YouTube 영상 검색</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">검색어</label>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="예: 갤럭시 S24 리뷰"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-sm font-medium">영상 수</label>
                    <select
                      value={maxResults}
                      onChange={(e) => setMaxResults(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value={5}>5개</option>
                      <option value={10}>10개</option>
                      <option value={15}>15개</option>
                      <option value={25}>25개</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">정렬</label>
                    <select
                      value={order}
                      onChange={(e) =>
                        setOrder(e.target.value as "relevance" | "viewCount" | "date")
                      }
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="viewCount">조회수순</option>
                      <option value="relevance">관련성순</option>
                      <option value="date">최신순</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">기간</label>
                    <select
                      value={publishedAfter}
                      onChange={(e) => setPublishedAfter(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="7d">7일 이내</option>
                      <option value="30d">30일 이내</option>
                      <option value="90d">90일 이내</option>
                      <option value="any">전체</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="w-full"
                >
                  {isSearching ? "검색 중..." : "영상 검색"}
                </Button>

                {searchError && (
                  <p className="text-sm text-destructive">{searchError}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Video Selection & Existing Videos */}
          <div className="space-y-6">
            {/* Existing Videos (Edit Mode) */}
            {isEditMode && existingVideos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>등록된 영상 ({existingVideos.length}개)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {existingVideos.map((video) => (
                      <div
                        key={video.id}
                        className={`flex gap-3 p-2 rounded-lg border ${
                          video.isActive ? "" : "opacity-50"
                        }`}
                      >
                        {video.thumbnailUrl && (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-20 h-14 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <a
                            href={`https://youtube.com/watch?v=${video.youtubeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium truncate block hover:underline"
                          >
                            {video.title}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {video.channelName}
                            {video.metrics?.[0] && (
                              <span className="ml-2">
                                조회수 {formatNumber(video.metrics[0].viewCount)}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {video.videoType === "SHORTS" && (
                            <Badge variant="secondary" className="text-xs">
                              Shorts
                            </Badge>
                          )}
                          <Badge
                            variant={video.isActive ? "success" : "secondary"}
                            className="cursor-pointer"
                            onClick={() =>
                              toggleVideoMutation.mutate({
                                videoId: video.id,
                                isActive: !video.isActive,
                              })
                            }
                          >
                            {video.isActive ? "활성" : "비활성"}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-6 px-2"
                            onClick={() => {
                              if (confirm(`"${video.title}" 영상을 삭제하시겠습니까?`)) {
                                deleteVideoMutation.mutate(video.id);
                              }
                            }}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section 3: Video Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {isEditMode ? "영상 추가" : "3. 영상 선택"} ({selectedVideos.size}/
                    {searchResults.length})
                  </CardTitle>
                  {searchResults.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAll}
                      >
                        전체선택
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deselectAll}
                      >
                        선택해제
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    검색 결과가 여기에 표시됩니다.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {searchResults.map((video) => (
                      <div
                        key={video.videoId}
                        className={`flex gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedVideos.has(video.videoId)
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => toggleVideoSelection(video.videoId)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedVideos.has(video.videoId)}
                          onChange={() => {}}
                          className="mt-1"
                        />
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-24 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{video.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {video.channelName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              조회수 {formatNumber(video.viewCount)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              좋아요 {formatNumber(video.likeCount)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(video.duration)}
                            </span>
                            {video.isShorts && (
                              <Badge variant="secondary" className="text-xs">
                                Shorts
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {video.previewScore.toFixed(1)}점
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isEditMode && selectedVideos.size > 0 && (
                  <Button
                    type="button"
                    className="w-full mt-4"
                    onClick={handleAddSelectedVideos}
                    disabled={addVideoMutation.isPending}
                  >
                    {addVideoMutation.isPending
                      ? "추가 중..."
                      : `선택한 ${selectedVideos.size}개 영상 추가`}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Section 4: Score Preview & Submit (Create Mode Only) */}
            {!isEditMode && (
              <Card>
                <CardHeader>
                  <CardTitle>4. 점수 미리보기 & 저장</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedVideos.size > 0 ? (
                    <>
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">예상 상품 점수</p>
                          <p className="text-3xl font-bold text-primary">
                            {calculateEstimatedScore().toFixed(1)}
                            <span className="text-lg text-muted-foreground">/100</span>
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>선택된 영상: {selectedVideos.size}개</p>
                          <p>
                            총 조회수:{" "}
                            {formatNumber(
                              getSelectedVideos().reduce((sum, v) => sum + v.viewCount, 0)
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-2">선택된 영상 목록:</p>
                        <ul className="space-y-1">
                          {getSelectedVideos()
                            .sort((a, b) => b.previewScore - a.previewScore)
                            .slice(0, 5)
                            .map((video, idx) => (
                              <li key={video.videoId} className="flex justify-between">
                                <span className="truncate flex-1">
                                  {idx + 1}. {video.title}
                                </span>
                                <span className="ml-2">
                                  {video.previewScore.toFixed(1)}점
                                </span>
                              </li>
                            ))}
                          {selectedVideos.size > 5 && (
                            <li className="text-muted-foreground">
                              ... 외 {selectedVideos.size - 5}개
                            </li>
                          )}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      영상을 선택하면 예상 점수가 표시됩니다.
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={!isFormValid || createMutation.isPending}
                  >
                    {createMutation.isPending ? "등록 중..." : "상품 등록"}
                  </Button>

                  {!isFormValid && (
                    <p className="text-xs text-muted-foreground text-center">
                      상품명, 카테고리, 제휴 링크를 입력하고 영상을 선택해주세요.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

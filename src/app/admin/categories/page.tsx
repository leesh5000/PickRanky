"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchCategories(includeInactive: boolean) {
  const res = await fetch(`/api/admin/categories?includeInactive=${includeInactive}`);
  return res.json();
}

async function createCategory(data: {
  key: string;
  name: string;
  description?: string;
}) {
  const res = await fetch("/api/admin/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function updateCategory(id: string, data: Partial<Category>) {
  const res = await fetch(`/api/admin/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function deleteCategory(id: string) {
  const res = await fetch(`/api/admin/categories/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New category form
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories", showInactive],
    queryFn: () => fetchCategories(showInactive),
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
        setIsCreating(false);
        setNewKey("");
        setNewName("");
        setNewDescription("");
        setError(null);
      } else {
        setError(result.error);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      updateCategory(id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
        setEditingId(null);
        setError(null);
      } else {
        setError(result.error);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
        setError(null);
      } else {
        setError(result.error);
      }
    },
  });

  const categories: Category[] = data?.data?.categories || [];

  const handleCreate = () => {
    if (!newKey.trim() || !newName.trim()) {
      setError("Key and name are required");
      return;
    }
    createMutation.mutate({
      key: newKey.trim(),
      name: newName.trim(),
      description: newDescription.trim() || undefined,
    });
  };

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description || "");
    setEditSortOrder(category.sortOrder);
    setError(null);
  };

  const handleSaveEdit = (id: string) => {
    updateMutation.mutate({
      id,
      data: {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        sortOrder: editSortOrder,
      },
    });
  };

  const handleToggleActive = (category: Category) => {
    updateMutation.mutate({
      id: category.id,
      data: { isActive: !category.isActive },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">카테고리 관리</h1>
        <div className="flex gap-2">
          <Button
            variant={showInactive ? "default" : "outline"}
            onClick={() => setShowInactive(!showInactive)}
            size="sm"
          >
            {showInactive ? "모든 카테고리" : "활성만"}
          </Button>
          <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
            카테고리 추가
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create New Category Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>새 카테고리 추가</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Key (영문, 소문자)
                  </label>
                  <Input
                    placeholder="electronics"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value.toLowerCase())}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    영문 소문자, 숫자, 언더스코어만 사용
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    이름 (표시용)
                  </label>
                  <Input
                    placeholder="전자제품"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  설명 (선택)
                </label>
                <Input
                  placeholder="스마트폰, 노트북, 태블릿 등"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "저장 중..." : "저장"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewKey("");
                    setNewName("");
                    setNewDescription("");
                    setError(null);
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>카테고리 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              카테고리가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">순서</th>
                    <th className="text-left py-3 px-2">Key</th>
                    <th className="text-left py-3 px-2">이름</th>
                    <th className="text-left py-3 px-2">설명</th>
                    <th className="text-center py-3 px-2">상태</th>
                    <th className="text-right py-3 px-2">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-b hover:bg-muted/50">
                      {editingId === category.id ? (
                        <>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              value={editSortOrder}
                              onChange={(e) => setEditSortOrder(Number(e.target.value))}
                              className="w-16"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {category.key}
                            </code>
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="설명 없음"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge variant={category.isActive ? "success" : "secondary"}>
                              {category.isActive ? "활성" : "비활성"}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSaveEdit(category.id)}
                                disabled={updateMutation.isPending}
                              >
                                저장
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingId(null);
                                  setError(null);
                                }}
                              >
                                취소
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-2">
                            <span className="text-muted-foreground">{category.sortOrder}</span>
                          </td>
                          <td className="py-3 px-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {category.key}
                            </code>
                          </td>
                          <td className="py-3 px-2 font-medium">{category.name}</td>
                          <td className="py-3 px-2">
                            <span className="text-muted-foreground">
                              {category.description || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge variant={category.isActive ? "success" : "secondary"}>
                              {category.isActive ? "활성" : "비활성"}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEdit(category)}
                              >
                                편집
                              </Button>
                              <Button
                                variant={category.isActive ? "secondary" : "default"}
                                size="sm"
                                onClick={() => handleToggleActive(category)}
                              >
                                {category.isActive ? "비활성화" : "활성화"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(category.id)}
                              >
                                삭제
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

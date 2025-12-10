"use client";

import { useQuery } from "@tanstack/react-query";

export interface Category {
  id: string;
  key: string;
  name: string;
  description: string | null;
  productCount?: number;
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories", {
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to fetch categories");
  }
  return data.data;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useCategoryMap() {
  const { data: categories, ...rest } = useCategories();

  const categoryMap = categories?.reduce((acc, cat) => {
    acc[cat.key] = cat.name;
    return acc;
  }, {} as Record<string, string>) || {};

  return { categoryMap, categories, ...rest };
}

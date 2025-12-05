"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORY_ICONS: Record<string, string> = {
  electronics: "💻",
  beauty: "💄",
  appliances: "🏠",
  food: "🍽️",
};

async function fetchCategories() {
  const res = await fetch("/api/categories");
  return res.json();
}

export default function CategoriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const categories = data?.data || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold mb-6">카테고리</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category: any) => (
              <Link key={category.id} href={`/categories/${category.id}`}>
                <Card className="hover:shadow-md transition cursor-pointer h-full">
                  <CardContent className="p-6 text-center">
                    <div className="text-5xl mb-4">
                      {CATEGORY_ICONS[category.id] || "📦"}
                    </div>
                    <h2 className="text-xl font-bold mb-2">{category.name}</h2>
                    <p className="text-muted-foreground">
                      {category.productCount}개 상품
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CategoryClient } from "./category-client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pickranky.com";

interface Props {
  params: { category: string };
}

async function getCategory(key: string) {
  return prisma.category.findUnique({
    where: { key, isActive: true },
    select: { key: true, name: true, description: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory(params.category);

  if (!category) {
    return {
      title: "카테고리를 찾을 수 없습니다",
    };
  }

  const title = `${category.name} 랭킹`;
  const description =
    category.description ||
    `${category.name} 카테고리 인기 상품 랭킹. 유튜브 리뷰 기반 트렌드 상품 순위를 확인하세요.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | PickRanky`,
      description,
      url: `${SITE_URL}/categories/${params.category}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | PickRanky`,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/categories/${params.category}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategory(params.category);

  if (!category) {
    notFound();
  }

  // JSON-LD BreadcrumbList
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "카테고리",
        item: `${SITE_URL}/categories`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `${SITE_URL}/categories/${params.category}`,
      },
    ],
  };

  // JSON-LD ItemList
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} 랭킹`,
    description: `${category.name} 카테고리 인기 상품 랭킹`,
    url: `${SITE_URL}/categories/${params.category}`,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Header />
      <CategoryClient categoryKey={params.category} categoryLabel={category.name} />
      <Footer />
    </div>
  );
}

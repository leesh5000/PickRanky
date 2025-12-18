import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { NewsDetailClient } from "./news-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

async function getArticle(id: string) {
  const article = await prisma.article.findUnique({
    where: { id, isActive: true },
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              thumbnailUrl: true,
              affiliateUrl: true,
              price: true,
              originalPrice: true,
              discountRate: true,
              category: true,
            },
          },
        },
      },
      _count: {
        select: { views: true, shares: true },
      },
    },
  });

  if (!article) return null;

  // Get ranking info
  const ranking = await prisma.articleRanking.findFirst({
    where: { articleId: id },
    orderBy: { createdAt: "desc" },
  });

  return {
    ...article,
    products: article.products.map((ap) => ap.product),
    ranking: ranking
      ? {
          rank: ranking.rank,
          previousRank: ranking.previousRank,
          score: ranking.score,
        }
      : null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    return {
      title: "기사를 찾을 수 없습니다 | PickRanky",
    };
  }

  return {
    title: `${article.title} | PickRanky`,
    description: article.summary || `${article.title} - AI 요약 기사`,
    openGraph: {
      title: article.title,
      description: article.summary || undefined,
      images: article.thumbnailUrl ? [article.thumbnailUrl] : undefined,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary || undefined,
      images: article.thumbnailUrl ? [article.thumbnailUrl] : undefined,
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    notFound();
  }

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    image: article.thumbnailUrl,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    publisher: {
      "@type": "Organization",
      name: "PickRanky",
      url: "https://pickranky.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://pickranky.com/news/${article.id}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NewsDetailClient
        initialData={{
          id: article.id,
          title: article.title,
          summary: article.summary,
          originalUrl: article.originalUrl,
          thumbnailUrl: article.thumbnailUrl,
          source: article.source,
          category: article.category,
          publishedAt: article.publishedAt.toISOString(),
          products: article.products,
          _count: article._count,
          ranking: article.ranking,
        }}
        articleId={id}
      />
    </>
  );
}

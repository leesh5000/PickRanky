import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductClient } from "./product-client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pickranky.com";

interface Props {
  params: { id: string };
}

async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id, isActive: true },
    include: {
      videos: {
        where: { isActive: true },
        include: {
          metrics: {
            orderBy: { collectedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { publishedAt: "desc" },
      },
      rankings: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          period: true,
        },
      },
    },
  });

  if (!product) return null;

  // Transform data for client
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    thumbnailUrl: product.thumbnailUrl,
    affiliateUrl: product.affiliateUrl,
    price: product.price,
    originalPrice: product.originalPrice,
    discountRate: product.discountRate,
    videos: product.videos.map((video) => ({
      id: video.id,
      youtubeId: video.youtubeId,
      title: video.title,
      channelName: video.channelName,
      thumbnailUrl: video.thumbnailUrl,
      videoType: video.videoType,
      publishedAt: video.publishedAt.toISOString(),
      latestMetric: video.metrics[0]
        ? {
            viewCount: video.metrics[0].viewCount,
            likeCount: video.metrics[0].likeCount,
            commentCount: video.metrics[0].commentCount,
          }
        : null,
    })),
    rankings: product.rankings.map((r) => ({
      rank: r.rank,
      score: r.score,
    })),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id);

  if (!product) {
    return {
      title: "상품을 찾을 수 없습니다",
    };
  }

  const title = product.name;
  const description = product.price
    ? `${product.name} - ${product.price.toLocaleString()}원 | 유튜브 리뷰 ${product.videos.length}개`
    : `${product.name} | 유튜브 리뷰 ${product.videos.length}개`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | PickRanky`,
      description,
      url: `${SITE_URL}/products/${params.id}`,
      type: "website",
      images: product.thumbnailUrl
        ? [
            {
              url: product.thumbnailUrl,
              width: 800,
              height: 600,
              alt: product.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | PickRanky`,
      description,
      images: product.thumbnailUrl ? [product.thumbnailUrl] : undefined,
    },
    alternates: {
      canonical: `${SITE_URL}/products/${params.id}`,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  // JSON-LD Structured Data for Product
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: `${product.name} - 유튜브 리뷰 기반 트렌드 상품`,
    image: product.thumbnailUrl || undefined,
    url: `${SITE_URL}/products/${params.id}`,
    ...(product.price && {
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: "KRW",
        availability: "https://schema.org/InStock",
      },
    }),
    ...(product.rankings.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Math.min(5, product.rankings[0].score / 20).toFixed(1),
        bestRating: "5",
        worstRating: "1",
        ratingCount: product.videos.length,
      },
    }),
  };

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
        name: "랭킹",
        item: `${SITE_URL}/rankings`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${SITE_URL}/products/${params.id}`,
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />
      <ProductClient initialData={product} productId={params.id} />
      <Footer />
    </div>
  );
}

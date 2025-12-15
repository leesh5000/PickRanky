import { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pickranky.com";

export const metadata: Metadata = {
  title: "카테고리",
  description:
    "전자기기, 뷰티, 가전제품, 음식 등 카테고리별 인기 상품을 확인하세요. 유튜브 리뷰 기반 트렌드 상품 랭킹.",
  openGraph: {
    title: "카테고리 | PickRanky",
    description:
      "전자기기, 뷰티, 가전제품, 음식 등 카테고리별 인기 상품을 확인하세요.",
    url: `${SITE_URL}/categories`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "카테고리 | PickRanky",
    description:
      "전자기기, 뷰티, 가전제품, 음식 등 카테고리별 인기 상품을 확인하세요.",
  },
  alternates: {
    canonical: `${SITE_URL}/categories`,
  },
};

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

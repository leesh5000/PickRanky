import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pickranky.com";
const SITE_NAME = "PickRanky";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PickRanky - 트렌딩 쇼핑 상품 랭킹",
    template: "%s | PickRanky",
  },
  description:
    "유튜브 리뷰 기반 실시간 쇼핑 상품 트렌드 순위. 전자기기, 뷰티, 가전제품, 음식 등 카테고리별 인기 상품을 확인하세요.",
  keywords: [
    "쇼핑 트렌드",
    "인기 상품",
    "상품 랭킹",
    "유튜브 리뷰",
    "쇼핑 순위",
    "전자기기",
    "뷰티",
    "가전제품",
    "쿠팡",
    "최저가",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "PickRanky - 트렌딩 쇼핑 상품 랭킹",
    description:
      "유튜브 리뷰 기반 실시간 쇼핑 상품 트렌드 순위. 지금 가장 핫한 상품을 확인하세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PickRanky - 트렌딩 쇼핑 상품 랭킹",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PickRanky - 트렌딩 쇼핑 상품 랭킹",
    description:
      "유튜브 리뷰 기반 실시간 쇼핑 상품 트렌드 순위. 지금 가장 핫한 상품을 확인하세요.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Google Search Console 인증 코드 (아래 등록 방법 참고)
    google: "1JOCfEaZ-yJOoiFmfhDKTbVCAsaymjtooPN3SWtS9iQ", // 예: "abc123xyz..."
    other: {
      // Naver Search Advisor 인증 코드 (아래 등록 방법 참고)
      "naver-site-verification": "0f4fd6811ee063ef33495bd57b1cd9cb08de5152", // 예: "abc123xyz..."
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

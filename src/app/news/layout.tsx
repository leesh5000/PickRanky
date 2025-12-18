import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "기사 트렌드 | PickRanky",
  description: "AI가 요약한 쇼핑 트렌드 기사 랭킹. 네이버, 구글 뉴스에서 수집한 최신 쇼핑 트렌드를 확인하세요.",
  openGraph: {
    title: "기사 트렌드 | PickRanky",
    description: "AI가 요약한 쇼핑 트렌드 기사 랭킹",
    type: "website",
  },
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

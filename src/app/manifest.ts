import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PickRanky - 트렌딩 쇼핑 상품 랭킹",
    short_name: "PickRanky",
    description: "유튜브 리뷰 기반 실시간 쇼핑 상품 트렌드 순위",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3B82F6",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

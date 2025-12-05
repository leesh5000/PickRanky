// YouTube search queries by category

export const SEARCH_QUERIES = {
  electronics: [
    "스마트폰 리뷰",
    "노트북 추천",
    "IT 기기 리뷰",
    "가젯 언박싱",
    "태블릿 비교",
    "이어폰 추천",
    "스마트워치 리뷰",
  ],
  beauty: [
    "화장품 추천",
    "뷰티 하울",
    "스킨케어 루틴",
    "메이크업 리뷰",
    "향수 추천",
    "뷰티템 언박싱",
  ],
  appliances: [
    "가전제품 추천",
    "청소기 리뷰",
    "에어프라이어 추천",
    "공기청정기 비교",
    "냉장고 리뷰",
    "세탁기 추천",
    "에어컨 추천",
  ],
  food: [
    "먹방 추천템",
    "음식 리뷰",
    "맛집 추천",
    "편의점 신상",
    "밀키트 리뷰",
    "간식 추천",
  ],
} as const;

export type CategoryKey = keyof typeof SEARCH_QUERIES;

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  electronics: "전자기기/IT",
  beauty: "뷰티/화장품",
  appliances: "가전제품",
  food: "음식",
};

// Keywords to identify product review videos
export const REVIEW_KEYWORDS = [
  "리뷰",
  "후기",
  "언박싱",
  "추천",
  "비교",
  "솔직",
  "찐",
  "팩트",
  "하울",
  "쇼핑",
];

// Keywords to filter out non-product videos
export const EXCLUDE_KEYWORDS = [
  "ASMR",
  "브이로그",
  "vlog",
  "일상",
  "게임",
  "플레이",
  "먹방", // 음식 카테고리가 아닌 경우
];

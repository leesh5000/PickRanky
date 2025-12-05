import {
  jaroWinklerSimilarity,
  removeKoreanParticles,
  normalizeKorean,
  findBrandInText,
} from "@/lib/utils/string";
import prisma from "@/lib/prisma";
import { CategoryKey } from "@/lib/youtube/queries";

// Known brand names for better matching
const BRAND_DICTIONARY = {
  electronics: [
    "삼성", "samsung", "애플", "apple", "아이폰", "iphone", "갤럭시", "galaxy",
    "LG", "lg", "소니", "sony", "샤오미", "xiaomi", "화웨이", "huawei",
    "레노버", "lenovo", "에이수스", "asus", "델", "dell", "HP", "hp",
    "MSI", "msi", "구글", "google", "픽셀", "pixel", "원플러스", "oneplus",
    "오포", "oppo", "비보", "vivo", "레드미", "redmi",
  ],
  beauty: [
    "설화수", "라네즈", "이니스프리", "에뛰드", "미샤", "더페이스샵",
    "에스티로더", "랑콤", "샤넬", "디올", "맥", "나스", "로레알",
    "아모레퍼시픽", "올리브영", "클리오", "페리페라", "롬앤",
    "헤라", "오휘", "숨37", "후", "비욘드", "네이처리퍼블릭",
  ],
  appliances: [
    "다이슨", "dyson", "삼성", "samsung", "LG", "lg", "필립스", "philips",
    "보쉬", "bosch", "일렉트로룩스", "electrolux", "밀레", "miele",
    "쿠첸", "쿠쿠", "cuckoo", "위니아", "대우", "신일", "오쿠",
    "에어메이드", "블루에어", "샤오미", "샤프", "파나소닉",
  ],
  food: [
    "농심", "오뚜기", "삼양", "CJ", "풀무원", "동원", "해태",
    "롯데", "오리온", "빙그레", "남양", "매일", "서울우유",
    "스타벅스", "이디야", "투썸플레이스", "배스킨라빈스",
  ],
} as Record<CategoryKey, string[]>;

// Patterns to extract product names from video titles
const PRODUCT_PATTERNS = [
  /\[([^\]]+)\]\s*(?:리뷰|후기|언박싱)/, // [상품명] 리뷰
  /【([^】]+)】\s*(?:리뷰|후기|언박싱)/, // 【상품명】 리뷰
  /(.+?)\s*(?:솔직|찐|팩트)\s*(?:리뷰|후기)/, // 상품명 솔직 리뷰
  /(.+?)\s*(?:리뷰|후기|언박싱|추천|비교)/, // 상품명 리뷰
  /(.+?)\s*(?:vs|VS|대)\s+/, // 비교 영상
  /(.+?)\s*\d+(?:일|주|개월)\s*(?:사용|후기)/, // N일/주/개월 사용 후기
];

// Stop words to remove from product names
const STOP_WORDS = [
  "리뷰", "후기", "언박싱", "추천", "비교", "솔직", "찐", "팩트",
  "하울", "쇼핑", "구매", "개봉기", "사용기", "체험", "테스트",
  "브이로그", "일상", "신제품", "신상", "최신", "인기", "베스트",
  "가성비", "최고", "최저", "할인", "세일", "이벤트", "공구",
  "1위", "2위", "3위", "TOP", "top", "BEST", "best",
];

// Characters to remove
const REMOVE_CHARS = /[🎁🔥✨💕❤️👍📦🎉💯⭐️★☆!?~@#$%^&*()+=<>{}[\]|\\:;"',.<>\/`]/g;

export interface NormalizedProduct {
  name: string;
  normalizedName: string;
  brand: string | null;
  category: CategoryKey;
}

/**
 * Extract and normalize product name from video title
 */
export function extractProductName(
  title: string,
  category: CategoryKey
): NormalizedProduct | null {
  // Clean the title
  let cleaned = title
    .replace(REMOVE_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Try to match product patterns
  let productName = "";
  for (const pattern of PRODUCT_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      productName = match[1].trim();
      break;
    }
  }

  // If no pattern matched, use cleaned title
  if (!productName) {
    productName = cleaned;
  }

  // Remove stop words
  for (const word of STOP_WORDS) {
    productName = productName.replace(new RegExp(word, "gi"), "");
  }

  // Remove Korean particles
  productName = removeKoreanParticles(productName);

  // Trim and clean
  productName = productName.replace(/\s+/g, " ").trim();

  // Skip if too short or too long
  if (productName.length < 2 || productName.length > 100) {
    return null;
  }

  // Find brand
  const brands = BRAND_DICTIONARY[category] || [];
  const brand = findBrandInText(productName, brands);

  // Create normalized name for grouping
  const normalizedName = normalizeKorean(productName);

  if (normalizedName.length < 2) {
    return null;
  }

  return {
    name: productName,
    normalizedName,
    brand,
    category,
  };
}

/**
 * Find existing product with similar name or create new one
 */
export async function findOrCreateProduct(
  normalizedProduct: NormalizedProduct
): Promise<string> {
  const { name, normalizedName, category } = normalizedProduct;

  // First, try exact match
  const exactMatch = await prisma.product.findUnique({
    where: { normalizedName },
    select: { id: true },
  });

  if (exactMatch) {
    return exactMatch.id;
  }

  // Try fuzzy match with existing products in same category
  const existingProducts = await prisma.product.findMany({
    where: {
      category,
      isActive: true,
    },
    select: {
      id: true,
      normalizedName: true,
      name: true,
    },
  });

  // Find best match using Jaro-Winkler similarity
  let bestMatch: { id: string; similarity: number } | null = null;

  for (const product of existingProducts) {
    const similarity = jaroWinklerSimilarity(
      normalizedName,
      product.normalizedName
    );

    if (similarity > 0.85) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { id: product.id, similarity };
      }
    }
  }

  if (bestMatch) {
    return bestMatch.id;
  }

  // Create new product
  const newProduct = await prisma.product.create({
    data: {
      name,
      normalizedName,
      category,
    },
  });

  return newProduct.id;
}

/**
 * Infer category from title if not provided
 */
export function inferCategory(title: string): CategoryKey | null {
  const titleLower = title.toLowerCase();

  // Electronics keywords
  const electronicsKeywords = [
    "스마트폰", "핸드폰", "폰", "노트북", "태블릿", "이어폰", "헤드폰",
    "스마트워치", "워치", "키보드", "마우스", "모니터", "카메라",
    "아이폰", "갤럭시", "아이패드", "맥북", "에어팟",
  ];

  // Beauty keywords
  const beautyKeywords = [
    "화장품", "스킨케어", "메이크업", "립스틱", "파운데이션", "쿠션",
    "로션", "토너", "에센스", "크림", "마스크팩", "세럼", "선크림",
    "향수", "퍼퓸", "아이섀도", "블러셔",
  ];

  // Appliances keywords
  const appliancesKeywords = [
    "청소기", "에어컨", "냉장고", "세탁기", "건조기", "식기세척기",
    "에어프라이어", "전자레인지", "밥솥", "공기청정기", "가습기",
    "제습기", "선풍기", "히터", "헤어드라이기", "고데기", "다리미",
  ];

  // Food keywords
  const foodKeywords = [
    "라면", "과자", "음료", "커피", "차", "밀키트", "도시락", "빵",
    "케이크", "아이스크림", "초콜릿", "젤리", "맥주", "소주", "와인",
    "먹방", "맛집", "편의점",
  ];

  for (const keyword of electronicsKeywords) {
    if (titleLower.includes(keyword)) return "electronics";
  }

  for (const keyword of beautyKeywords) {
    if (titleLower.includes(keyword)) return "beauty";
  }

  for (const keyword of appliancesKeywords) {
    if (titleLower.includes(keyword)) return "appliances";
  }

  for (const keyword of foodKeywords) {
    if (titleLower.includes(keyword)) return "food";
  }

  return null;
}

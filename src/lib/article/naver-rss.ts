import { XMLParser } from "fast-xml-parser";

export interface NaverRssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface ParsedArticle {
  title: string;
  originalUrl: string;
  description: string;
  publishedAt: Date;
  source: "NAVER";
  category: string;
}

// 네이버 뉴스 RSS 피드 URL (섹션별)
// IT/과학: 105, 생활/문화: 103, 경제: 101
const NAVER_RSS_FEEDS: Record<string, string> = {
  electronics: "https://rss.news.naver.com/rss/news.nhn?mode=LSD&mid=sec&sid1=105",
  beauty: "https://rss.news.naver.com/rss/news.nhn?mode=LSD&mid=sec&sid1=103",
  appliances: "https://rss.news.naver.com/rss/news.nhn?mode=LSD&mid=sec&sid1=105",
  food: "https://rss.news.naver.com/rss/news.nhn?mode=LSD&mid=sec&sid1=103",
};

// 카테고리별 관련 키워드 (필터링용)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  electronics: ["스마트폰", "노트북", "태블릿", "이어폰", "헤드폰", "IT", "디지털", "가젯", "애플", "삼성", "LG", "전자기기"],
  beauty: ["화장품", "뷰티", "스킨케어", "메이크업", "선크림", "세럼", "에센스", "파운데이션", "립스틱"],
  appliances: ["가전", "냉장고", "세탁기", "에어컨", "청소기", "로봇청소기", "TV", "모니터"],
  food: ["식품", "간식", "음료", "커피", "건강식품", "영양제", "맛집", "먹거리"],
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]*>/g, "") // HTML 태그 제거
    .trim();
}

function parseRssXml(xml: string): NaverRssItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  try {
    const result = parser.parse(xml);
    const items = result?.rss?.channel?.item;

    if (!items) return [];

    const itemArray = Array.isArray(items) ? items : [items];

    return itemArray.map((item) => ({
      title: decodeHtmlEntities(item.title || ""),
      link: item.link || "",
      description: decodeHtmlEntities(item.description || ""),
      pubDate: item.pubDate || "",
    }));
  } catch (error) {
    console.error("RSS XML 파싱 오류:", error);
    return [];
  }
}

function isRelevantArticle(title: string, description: string, category: string): boolean {
  const keywords = CATEGORY_KEYWORDS[category] || [];
  const text = `${title} ${description}`.toLowerCase();

  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

export async function fetchNaverRss(category: string): Promise<ParsedArticle[]> {
  const feedUrl = NAVER_RSS_FEEDS[category];
  if (!feedUrl) {
    console.warn(`알 수 없는 카테고리: ${category}`);
    return [];
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PickRanky/1.0)",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`RSS 피드 요청 실패: ${response.status}`);
    }

    const xml = await response.text();
    const items = parseRssXml(xml);

    // 카테고리 관련 기사만 필터링
    const relevantItems = items.filter((item) =>
      isRelevantArticle(item.title, item.description, category)
    );

    return relevantItems.map((item) => ({
      title: item.title,
      originalUrl: item.link,
      description: item.description,
      publishedAt: new Date(item.pubDate),
      source: "NAVER" as const,
      category,
    }));
  } catch (error) {
    console.error(`네이버 RSS 수집 오류 (${category}):`, error);
    return [];
  }
}

export async function fetchAllNaverRss(): Promise<ParsedArticle[]> {
  const categories = Object.keys(NAVER_RSS_FEEDS);
  const results: ParsedArticle[] = [];

  for (const category of categories) {
    const articles = await fetchNaverRss(category);
    results.push(...articles);
    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

export { NAVER_RSS_FEEDS, CATEGORY_KEYWORDS };

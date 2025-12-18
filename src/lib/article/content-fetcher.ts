import * as cheerio from "cheerio";

export interface ArticleContent {
  title: string;
  content: string;
  thumbnailUrl: string | null;
}

// 뉴스 사이트별 콘텐츠 셀렉터 (확장 가능)
const SITE_SELECTORS: Record<string, { content: string; title: string; thumbnail: string }> = {
  "news.naver.com": {
    content: "#dic_area, #articeBody, .newsct_article",
    title: "h2#title_area, .media_end_head_headline",
    thumbnail: "img._LAZY_LOADING, .end_photo_org img",
  },
  "n.news.naver.com": {
    content: "#dic_area, #newsct_article",
    title: ".media_end_head_headline",
    thumbnail: ".end_photo_org img",
  },
  default: {
    content: "article, .article-body, .article-content, .news-content, main p",
    title: "h1, .article-title",
    thumbnail: "article img, .article-body img",
  },
};

function getSiteSelectors(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return SITE_SELECTORS[hostname] || SITE_SELECTORS.default;
  } catch {
    return SITE_SELECTORS.default;
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

async function resolveGoogleNewsUrl(url: string): Promise<string> {
  // Google News RSS URL인 경우 실제 기사 URL로 변환
  if (url.includes("news.google.com/rss/articles/") || url.includes("news.google.com/articles/")) {
    try {
      // Google News 페이지를 fetch하여 실제 URL 추출
      const response = await fetch(url, {
        redirect: "manual", // 리다이렉트 수동 처리
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      // 302 리다이렉트 응답에서 Location 헤더 추출
      const location = response.headers.get("location");
      if (location && !location.includes("news.google.com")) {
        return location;
      }

      // HTML에서 실제 URL 추출 시도
      const html = await response.text();

      // data-n-au 속성에서 URL 추출 (Google News 페이지에서 사용)
      const dataAuMatch = html.match(/data-n-au="([^"]+)"/);
      if (dataAuMatch) {
        return dataAuMatch[1];
      }

      // jslog 속성에서 URL 추출
      const jslogMatch = html.match(/jslog="[^"]*url:([^;,"]+)/);
      if (jslogMatch) {
        return decodeURIComponent(jslogMatch[1]);
      }

      // href로 시작하는 외부 링크 추출
      const hrefMatch = html.match(/href="(https?:\/\/(?!news\.google\.com)[^"]+)"/);
      if (hrefMatch) {
        return hrefMatch[1];
      }

      return url;
    } catch (error) {
      console.error("Google News URL 변환 실패:", error);
      return url;
    }
  }
  return url;
}

export async function fetchArticleContent(url: string): Promise<ArticleContent | null> {
  try {
    // Google News URL인 경우 실제 기사 URL로 변환
    const resolvedUrl = await resolveGoogleNewsUrl(url);

    const response = await fetch(resolvedUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error(`기사 요청 실패: ${response.status} - ${url}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const selectors = getSiteSelectors(url);

    // 제목 추출
    let title = $(selectors.title).first().text().trim();
    if (!title) {
      title = $("title").text().trim();
    }

    // 본문 추출
    let content = "";
    const contentElements = $(selectors.content);
    contentElements.each((_, el) => {
      const text = $(el).text();
      if (text.length > content.length) {
        content = text;
      }
    });

    // 본문이 너무 짧으면 모든 p 태그 수집
    if (content.length < 100) {
      const paragraphs: string[] = [];
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) {
          paragraphs.push(text);
        }
      });
      content = paragraphs.join("\n\n");
    }

    // 썸네일 추출
    let thumbnailUrl: string | null = null;
    const thumbnailImg = $(selectors.thumbnail).first();
    if (thumbnailImg.length) {
      thumbnailUrl = thumbnailImg.attr("src") || thumbnailImg.attr("data-src") || null;
      // 상대 경로를 절대 경로로 변환
      if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
        try {
          const baseUrl = new URL(url);
          thumbnailUrl = new URL(thumbnailUrl, baseUrl.origin).href;
        } catch {
          thumbnailUrl = null;
        }
      }
    }

    // og:image 폴백
    if (!thumbnailUrl) {
      thumbnailUrl = $('meta[property="og:image"]').attr("content") || null;
    }

    return {
      title: cleanText(title),
      content: cleanText(content),
      thumbnailUrl,
    };
  } catch (error) {
    console.error(`기사 크롤링 오류: ${url}`, error);
    return null;
  }
}

export async function fetchArticleContentWithRetry(
  url: string,
  maxRetries: number = 2
): Promise<ArticleContent | null> {
  for (let i = 0; i <= maxRetries; i++) {
    const result = await fetchArticleContent(url);
    if (result && result.content.length > 50) {
      return result;
    }
    // 재시도 전 대기
    if (i < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return null;
}

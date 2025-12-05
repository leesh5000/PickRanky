/**
 * OpenGraph image extraction utility
 */

export interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * Extracts OpenGraph data from a URL
 */
export async function fetchOpenGraphData(url: string): Promise<OpenGraphData> {
  try {
    // Check if URL is a Coupang link (they block server-side requests)
    if (url.includes('coupang.com') || url.includes('link.coupang.com')) {
      throw new Error('COUPANG_BLOCKED');
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Parse OpenGraph meta tags
    const ogData: OpenGraphData = {};

    // Helper function to extract meta content
    const extractMetaContent = (html: string, property: string): string | null => {
      // Match meta tags with property or name attribute
      const patterns = [
        // property="og:xxx" content="..."
        new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
        // content="..." property="og:xxx"
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
        // name="xxx" content="..."
        new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
        // content="..." name="xxx"
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      return null;
    };

    // Extract og:image
    ogData.image = extractMetaContent(html, 'og:image') ||
                   extractMetaContent(html, 'twitter:image') ||
                   undefined;

    // Extract og:title
    const title = extractMetaContent(html, 'og:title');
    if (title) {
      ogData.title = decodeHtmlEntities(title);
    }

    // Extract og:description
    const description = extractMetaContent(html, 'og:description');
    if (description) {
      ogData.description = decodeHtmlEntities(description);
    }

    // Extract og:url
    ogData.url = extractMetaContent(html, 'og:url') || undefined;

    return ogData;
  } catch (error) {
    console.error("Failed to fetch OpenGraph data:", error);
    throw error;
  }
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };

  return text.replace(
    /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g,
    (match) => entities[match] || match
  );
}

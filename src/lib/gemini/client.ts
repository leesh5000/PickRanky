import { GoogleGenerativeAI } from "@google/generative-ai";

let geminiClient: GoogleGenerativeAI | null = null;

function getGemini(): GoogleGenerativeAI {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
}

export interface SummarizeOptions {
  maxLength?: number;
  language?: "ko" | "en";
}

export async function summarizeArticle(
  content: string,
  options: SummarizeOptions = {}
): Promise<string | null> {
  const { maxLength = 300, language = "ko" } = options;

  if (!content || content.length < 50) {
    console.log("본문이 너무 짧아 요약을 생성할 수 없습니다.");
    return null;
  }

  const truncatedContent = content.length > 4000 ? content.slice(0, 4000) : content;

  try {
    const genAI = getGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `당신은 쇼핑 트렌드 기사를 요약하는 전문가입니다.
- 핵심 내용을 ${maxLength}자 이내로 간결하게 요약해주세요.
- ${language === "ko" ? "한국어" : "영어"}로 작성하세요.
- 객관적인 톤을 유지하세요.
- 제품명, 브랜드명, 핵심 특징을 포함하세요.
- 가격 정보가 있다면 포함하세요.

다음 기사를 요약해주세요:

${truncatedContent}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text()?.trim();

    return summary || null;
  } catch (error) {
    console.error("Gemini 요약 생성 오류:", error);
    return null;
  }
}

export async function classifyCategory(
  title: string,
  content: string
): Promise<string | null> {
  const truncatedContent = content.length > 1000 ? content.slice(0, 1000) : content;

  try {
    const genAI = getGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `기사를 다음 카테고리 중 하나로 분류하세요:
- electronics: 스마트폰, 노트북, 태블릿, 이어폰, IT 기기
- beauty: 화장품, 스킨케어, 메이크업, 뷰티 제품
- appliances: 가전제품, 냉장고, 세탁기, 청소기, TV
- food: 식품, 음료, 건강식품, 간식

해당하는 카테고리 키워드만 반환하세요. 해당 없으면 null을 반환하세요.

제목: ${title}
내용: ${truncatedContent}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const category = response.text()?.trim().toLowerCase();

    const validCategories = ["electronics", "beauty", "appliances", "food"];

    if (category && validCategories.includes(category)) {
      return category;
    }
    return null;
  } catch (error) {
    console.error("Gemini 카테고리 분류 오류:", error);
    return null;
  }
}

export async function summarizeFromMetadata(
  title: string,
  description: string,
  options: SummarizeOptions = {}
): Promise<string | null> {
  const { maxLength = 200, language = "ko" } = options;

  if (!title || title.length < 10) {
    console.log("제목이 너무 짧아 요약을 생성할 수 없습니다.");
    return null;
  }

  const inputText = description && description.length > 10
    ? `제목: ${title}\n설명: ${description}`
    : `제목: ${title}`;

  try {
    const genAI = getGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `당신은 쇼핑 트렌드 뉴스 기사를 요약하는 전문가입니다.
- 주어진 제목과 설명을 바탕으로 ${maxLength}자 이내의 요약을 작성하세요.
- ${language === "ko" ? "한국어" : "영어"}로 작성하세요.
- 객관적인 톤을 유지하세요.
- 핵심 내용과 트렌드를 강조하세요.
- 제품명, 브랜드명이 있다면 포함하세요.

다음 기사 정보를 바탕으로 요약을 작성해주세요:

${inputText}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text()?.trim();

    return summary || null;
  } catch (error) {
    console.error("Gemini 메타데이터 기반 요약 생성 오류:", error);
    return null;
  }
}

export async function extractKeywords(content: string): Promise<string[]> {
  const truncatedContent = content.length > 2000 ? content.slice(0, 2000) : content;

  try {
    const genAI = getGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `기사에서 쇼핑/제품 관련 핵심 키워드를 5개 이하로 추출하세요.
제품명, 브랜드명, 카테고리 등을 포함하세요.
키워드는 쉼표로 구분하여 반환하세요.

${truncatedContent}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const keywords = response.text()?.trim();

    if (keywords) {
      return keywords.split(",").map((k) => k.trim()).filter(Boolean);
    }
    return [];
  } catch (error) {
    console.error("Gemini 키워드 추출 오류:", error);
    return [];
  }
}

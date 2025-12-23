import * as cheerio from "cheerio";
import DOMPurify from "isomorphic-dompurify";

/**
 * HTML 콘텐츠를 안전하게 정제하는 함수
 */
export function sanitizeHtmlContent(htmlContent: string): string {
  // 허용할 HTML 태그와 속성 정의
  const allowedTags = ["p", "br", "strong", "em", "u", "span", "ul", "ol", "li", "blockquote", "mark", "h1", "h2", "h3", "h4", "h5", "h6"];

  const allowedAttributes = {
    span: ["style"], // 색상 등 인라인 스타일 허용
    p: ["style"],
    strong: [],
    em: [],
    u: [],
    mark: [],
    ul: [],
    ol: [],
    li: [],
    blockquote: [],
    br: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
  };

  return DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: Object.values(allowedAttributes).flat(),
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * HTML에서 일반 텍스트 추출
 */
export function extractPlainText(htmlContent: string): string {
  const $ = cheerio.load(htmlContent);
  return $.text().trim();
}

/**
 * OG 미리보기 텍스트 생성
 */
export function generatePreviewText(htmlContent: string, maxLength: number = 60): string {
  const plainText = extractPlainText(htmlContent);
  return plainText.length > maxLength ? plainText.slice(0, maxLength) + "..." : plainText;
}

/**
 * HTML 콘텐츠인지 확인
 */
export function isHtmlContent(content: string): boolean {
  return /<[^>]*>/g.test(content);
}

/**
 * 텍스트를 HTML로 변환 (줄바꿈을 <br>로)
 */
export function textToHtml(text: string): string {
  return text.replace(/\n/g, "<br>");
}

/**
 * HTML 콘텐츠 크기 검증
 */
export function validateContentSize(content: string, maxSize: number = 50000): boolean {
  return content.length <= maxSize;
}

import * as cheerio from "cheerio";
import sanitize from "sanitize-html";

const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    // 텍스트 서식
    "p", "br", "b", "i", "u", "s", "em", "strong", "span",
    // 구조
    "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote",
    // 리스트
    "ul", "ol", "li",
    // 링크/이미지
    "a", "img",
    // 테이블
    "table", "thead", "tbody", "tr", "th", "td",
    // 기타
    "hr", "pre", "code",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    span: ["style"],
    p: ["style"],
    div: ["style"],
    td: ["colspan", "rowspan", "style"],
    th: ["colspan", "rowspan", "style"],
  },
  allowedStyles: {
    "*": {
      color: [/.*/],
      "background-color": [/.*/],
      "font-size": [/.*/],
      "font-weight": [/.*/],
      "font-style": [/.*/],
      "text-decoration": [/.*/],
      "text-align": [/.*/],
      "margin": [/.*/],
      "padding": [/.*/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    }),
  },
};

/**
 * HTML 콘텐츠를 안전하게 정제하는 함수
 */
export function sanitizeHtmlContent(htmlContent: string): string {
  if (!htmlContent || htmlContent.trim() === "") {
    return "";
  }

  return sanitize(htmlContent, SANITIZE_OPTIONS);
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

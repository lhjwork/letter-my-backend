import * as cheerio from "cheerio";

/**
 * HTML 콘텐츠를 안전하게 정제하는 함수
 */
export function sanitizeHtmlContent(htmlContent: string): string {
  // cheerio를 사용하여 HTML 파싱
  const $ = cheerio.load(htmlContent);

  // 허용할 HTML 태그 정의
  const allowedTags = ["p", "br", "strong", "em", "u", "span", "ul", "ol", "li", "blockquote", "mark", "h1", "h2", "h3", "h4", "h5", "h6"];

  // 허용할 속성 정의
  const allowedAttributes = ["style"];

  // 모든 요소를 순회하면서 정제
  $("*").each((_, element) => {
    // any 타입으로 처리하여 타입 에러 회피
    const el = element as any;
    const tagName = el.tagName?.toLowerCase();

    // 허용되지 않은 태그 제거
    if (!tagName || !allowedTags.includes(tagName)) {
      $(element).remove();
      return;
    }

    // 속성 정제
    const attributes = el.attribs || {};
    Object.keys(attributes).forEach((attr) => {
      if (!allowedAttributes.includes(attr)) {
        $(element).removeAttr(attr);
      } else if (attr === "style") {
        // 스타일 속성 정제 (기본적인 CSS만 허용)
        const style = attributes[attr];
        const sanitizedStyle = sanitizeStyleAttribute(style);
        $(element).attr("style", sanitizedStyle);
      }
    });
  });

  // 스크립트 태그 완전 제거
  $("script").remove();
  $("iframe").remove();
  $("object").remove();
  $("embed").remove();

  return $.html();
}

/**
 * CSS 스타일 속성 정제
 */
function sanitizeStyleAttribute(style: string): string {
  if (!style) return "";

  // 허용할 CSS 속성들
  const allowedProperties = ["color", "background-color", "font-size", "font-weight", "font-style", "text-decoration", "text-align", "margin", "padding", "border"];

  // 위험한 CSS 값들 제거
  const dangerousValues = ["javascript:", "expression(", "url(", "@import"];

  const rules = style.split(";").filter((rule) => {
    const [property, value] = rule.split(":").map((s) => s.trim());

    if (!property || !value) return false;

    // 허용된 속성인지 확인
    const isAllowedProperty = allowedProperties.some((allowed) => property.toLowerCase().includes(allowed));

    if (!isAllowedProperty) return false;

    // 위험한 값이 포함되어 있는지 확인
    const hasDangerousValue = dangerousValues.some((dangerous) => value.toLowerCase().includes(dangerous));

    return !hasDangerousValue;
  });

  return rules.join("; ");
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

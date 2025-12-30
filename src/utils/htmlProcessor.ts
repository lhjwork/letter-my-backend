import * as cheerio from "cheerio";

/**
 * HTML 콘텐츠를 안전하게 정제하는 함수
 */
export function sanitizeHtmlContent(htmlContent: string): string {
  console.log("🧹 Sanitizing HTML content:", { input: htmlContent, length: htmlContent.length });

  if (!htmlContent || htmlContent.trim() === "") {
    console.log("❌ Empty content provided to sanitizeHtmlContent");
    return "";
  }

  try {
    // 임시로 간단한 처리: 위험한 태그만 제거하고 나머지는 그대로 유지
    let sanitized = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, ""); // onclick, onload 등 이벤트 핸들러 제거

    console.log("✅ Sanitized result (simple):", { result: sanitized, length: sanitized.length });
    return sanitized;
  } catch (error) {
    console.error("❌ Error in sanitizeHtmlContent:", error);
    // 에러 발생 시 원본 반환
    return htmlContent;
  }
}

/**
 * CSS 스타일 속성 정제 (현재 사용하지 않음)
 */
// function sanitizeStyleAttribute(style: string): string {
//   if (!style) return "";

//   // 허용할 CSS 속성들
//   const allowedProperties = ["color", "background-color", "font-size", "font-weight", "font-style", "text-decoration", "text-align", "margin", "padding", "border"];

//   // 위험한 CSS 값들 제거
//   const dangerousValues = ["javascript:", "expression(", "url(", "@import"];

//   const rules = style.split(";").filter((rule) => {
//     const [property, value] = rule.split(":").map((s) => s.trim());

//     if (!property || !value) return false;

//     // 허용된 속성인지 확인
//     const isAllowedProperty = allowedProperties.some((allowed) => property.toLowerCase().includes(allowed));

//     if (!isAllowedProperty) return false;

//     // 위험한 값이 포함되어 있는지 확인
//     const hasDangerousValue = dangerousValues.some((dangerous) => value.toLowerCase().includes(dangerous));

//     return !hasDangerousValue;
//   });

//   return rules.join("; ");
// }

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

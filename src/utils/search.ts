/** 사용자 입력을 $regex 에 넣기 전 이스케이프 + 길이 제한 (ReDoS 방지) */
export function safeSearch(input: unknown, max = 100): string | undefined {
  if (typeof input !== "string") return undefined;
  const s = input.trim().slice(0, max);
  return s ? s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : undefined;
}

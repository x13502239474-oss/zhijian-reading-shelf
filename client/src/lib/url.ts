/** 统一 URL 校验与归一化，用于去重与提交前检查。 */
export function isValidHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname;
  } catch {
    return false;
  }
}

export function canonicalUrl(raw: string): string {
  const url = new URL(raw.trim());
  url.hash = '';
  return url.toString();
}

export function extractUrls(text: string): string[] {
  const parts = text
    .split(/[\s,，;；]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    if (!seen.has(part)) {
      seen.add(part);
      result.push(part);
    }
  }
  return result;
}

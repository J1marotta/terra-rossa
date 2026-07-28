const MAX_DISPLAY_NAME_LENGTH = 20;

export function sanitizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return 'Dog';
  const normalized = value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} _'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH)
    .trim();
  return normalized || 'Dog';
}

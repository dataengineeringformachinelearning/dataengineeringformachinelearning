/**
 * Formats a service name to show only its proper, cleaned up name.
 * e.g., "localhost:8000 - api v1 system status status pages" -> "Status Pages"
 */
export const formatServiceName = (name: string): string => {
  if (!name) return '';

  const trimmed = name.trim();
  const lowercase = trimmed.toLowerCase();
  if (lowercase === 'django web server') {
    return 'Django Web Server';
  }
  // Human-authored labels are already the source of truth. Only normalize
  // legacy route-derived names containing separators or generated UUIDs.
  if (!trimmed.includes(' - ') && !/[/_-]/.test(trimmed) && !/[0-9a-f]{8}-/i.test(trimmed)) {
    return trimmed;
  }
  // Extract a short suffix from UUID if present to provide clear, unique context
  const uuidMatch = trimmed.match(
    /([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  const suffix = uuidMatch ? ` (${uuidMatch[1].toLowerCase()})` : '';

  const parts = trimmed.split(' - ');
  const cleanPart = parts.length > 1 ? parts.slice(1).join(' - ').trim() : trimmed;

  const words = cleanPart.split(/[\s/_-]+/);
  const skipWords = new Set(['api', 'v1', 'v2', 'system']);
  const uuidRegex = /^[0-9a-f]{4,12}$/i;

  const filteredWords: string[] = [];
  for (const w of words) {
    const lw = w.toLowerCase();
    if (!lw || skipWords.has(lw) || uuidRegex.test(lw)) {
      continue;
    }
    // Avoid consecutive duplicate words like "status status"
    if (filteredWords.length > 0 && filteredWords[filteredWords.length - 1].toLowerCase() === lw) {
      continue;
    }
    filteredWords.push(w);
  }

  const baseName =
    filteredWords.length === 0
      ? cleanPart
          .replace(/[_-]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
      : filteredWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  return baseName + suffix;
};

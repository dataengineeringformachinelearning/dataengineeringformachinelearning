/**
 * Formats a service name to show only its proper, cleaned up name.
 * e.g., "localhost:8000 - api v1 system status status pages" -> "Status Pages"
 */
export const formatServiceName = (name: string): string => {
  if (!name) return '';

  const lowercase = name.toLowerCase().trim();
  if (lowercase === 'django web server') {
    return 'Django Web Server';
  }
  // Extract a short suffix from UUID if present to provide clear, unique context
  const uuidMatch = name.match(/([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const suffix = uuidMatch ? ` (${uuidMatch[1].toLowerCase()})` : '';

  const parts = name.split(' - ');
  const cleanPart = parts.length > 1 ? parts.slice(1).join(' - ').trim() : name;

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

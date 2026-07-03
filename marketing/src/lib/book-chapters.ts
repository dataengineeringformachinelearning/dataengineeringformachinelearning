import fs from 'node:fs';
import { marked } from 'marked';

export interface BookChapter {
  slug: string;
  title: string;
  html: string;
  index: number;
}

const CHAPTER_SPLIT =
  /(?=^## (?:Chapter \d+:|Appendix|My Notes on Deployment & Release|Acknowledgements|Introduction))/m;

export function slugifyChapterTitle(title: string): string {
  const normalized = title
    .replace(/^##\s+/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'chapter';
}

export function loadBookChapters(markdownPath?: string): BookChapter[] {
  const pageMarkdownPath =
    markdownPath ?? `${process.cwd()}/src/assets/content/page.md`;
  const rawMarkdown = fs.readFileSync(pageMarkdownPath, 'utf-8');
  const rawChunks = rawMarkdown.split(CHAPTER_SPLIT).filter(chunk => chunk.trim());

  const chapters: BookChapter[] = [
    {
      slug: 'cover',
      title: 'Cover',
      html: '',
      index: 0,
    },
  ];

  rawChunks.forEach(chunk => {
    const trimmed = chunk.trim();
    const lines = trimmed.split('\n');
    const firstLine = lines[0] ?? '';
    const title = firstLine.startsWith('## ')
      ? firstLine.replace('## ', '').trim()
      : 'Introduction';

    chapters.push({
      slug: slugifyChapterTitle(title),
      title,
      html: String(marked.parse(trimmed)),
      index: chapters.length,
    });
  });

  if (chapters.length === 1) {
    chapters.push({
      slug: 'book-content',
      title: 'Book Content',
      html: String(marked.parse(rawMarkdown)),
      index: 1,
    });
  }

  return chapters;
}
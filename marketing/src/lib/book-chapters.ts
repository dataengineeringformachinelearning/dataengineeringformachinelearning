import fs from "node:fs";
import { marked } from "marked";

export type ChapterGroup =
  | "Front Matter"
  | "Chapters"
  | "Appendices"
  | "Back Matter"
  | "Reference";

export interface BookChapter {
  slug: string;
  title: string;
  html: string;
  index: number;
  group: ChapterGroup;
  num: string;
  shortTitle: string;
}

export const SIDEBAR_GROUPS: ChapterGroup[] = [
  "Front Matter",
  "Chapters",
  "Appendices",
  "Back Matter",
  "Reference",
];

const CHAPTER_SPLIT =
  /(?=^## (?:Chapter \d+:|Appendix|My Notes on Deployment & Release|Acknowledgements|Introduction|Concept of Operations))/m;

export function slugifyChapterTitle(title: string): string {
  const normalized = title
    .replace(/^##\s+/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "chapter";
}

export const getChapterMeta = (
  title: string,
  index: number,
): { group: ChapterGroup; num: string; shortTitle: string } => {
  if (title === "Cover") {
    return { group: "Front Matter", num: "", shortTitle: "Cover" };
  }
  if (title === "Introduction" || title.includes("CONOPS")) {
    return {
      group: "Front Matter",
      num: String(index).padStart(2, "0"),
      shortTitle: title.replace(/^Concept of Operations \(CONOPS\)$/, "CONOPS"),
    };
  }
  const chapterMatch = title.match(/^Chapter (\d+):\s*(.+)/);
  if (chapterMatch) {
    return {
      group: "Chapters",
      num: chapterMatch[1].padStart(2, "0"),
      shortTitle: chapterMatch[2],
    };
  }
  if (title.startsWith("Appendix")) {
    const appendixMatch = title.match(/^Appendix ([A-Z]):\s*(.+)/);
    return {
      group: "Appendices",
      num: appendixMatch?.[1] ?? String(index),
      shortTitle:
        appendixMatch?.[2] ?? title.replace(/^Appendix [A-Z]:\s*/, ""),
    };
  }
  if (title.includes("Acknowledgements") || title.includes("Deployment")) {
    return {
      group: "Back Matter",
      num: String(index).padStart(2, "0"),
      shortTitle: title,
    };
  }
  return {
    group: "Reference",
    num: String(index).padStart(2, "0"),
    shortTitle: title,
  };
};

export function loadBookChapters(markdownPath?: string): BookChapter[] {
  const pageMarkdownPath =
    markdownPath ?? `${process.cwd()}/src/assets/content/page.md`;
  const rawMarkdown = fs.readFileSync(pageMarkdownPath, "utf-8");
  const rawChunks = rawMarkdown
    .split(CHAPTER_SPLIT)
    .filter((chunk) => chunk.trim());

  const chapters: BookChapter[] = [
    {
      slug: "cover",
      title: "Cover",
      html: "",
      index: 0,
      group: "Front Matter",
      num: "",
      shortTitle: "Cover",
    },
  ];

  rawChunks.forEach((chunk, chunkIndex) => {
    const trimmed = chunk.trim();
    const lines = trimmed.split("\n");
    const firstLine = lines[0] ?? "";
    const title = firstLine.startsWith("## ")
      ? firstLine.replace("## ", "").trim()
      : "Introduction";
    const meta = getChapterMeta(title, chunkIndex + 1);

    chapters.push({
      slug: slugifyChapterTitle(title),
      title,
      html: String(marked.parse(trimmed)),
      index: chapters.length,
      ...meta,
    });
  });

  if (chapters.length === 1) {
    chapters.push({
      slug: "book-content",
      title: "Book Content",
      html: String(marked.parse(rawMarkdown)),
      index: 1,
      group: "Reference",
      num: "01",
      shortTitle: "Book Content",
    });
  }

  return chapters;
}

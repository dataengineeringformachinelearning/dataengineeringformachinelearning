"""Build frontend search-index.json from synced BOOK.md content (page.md)."""

from __future__ import annotations

import hashlib
import json
import os
import re
from typing import Final

_SECTION_RE: Final[re.Pattern[str]] = re.compile(r"^## (.+)$", re.MULTILINE)


def _slugify(title: str) -> str:
  slug = re.sub(r"[^\w\s-]", "", title.lower().strip())
  slug = re.sub(r"[\s_]+", "-", slug)
  return slug[:80].strip("-") or "section"


def _section_id(title: str) -> str:
  digest = hashlib.md5(title.encode("utf-8")).hexdigest()[:6]
  return f"{_slugify(title)}-{digest}"


def _parse_sections(markdown: str) -> list[tuple[str, str]]:
  """Return (title, full_section_markdown) for each ## heading block."""
  stripped = markdown.lstrip()
  if stripped.startswith("---"):
    end = stripped.find("---", 3)
    if end != -1:
      stripped = stripped[end + 3 :].lstrip()

  matches = list(_SECTION_RE.finditer(stripped))
  if not matches:
    return []

  sections: list[tuple[str, str]] = []
  for idx, match in enumerate(matches):
    title = match.group(1).strip()
    start = match.start()
    end = matches[idx + 1].start() if idx + 1 < len(matches) else len(stripped)
    content = stripped[start:end].rstrip()
    sections.append((title, content))
  return sections


def build_search_index(page_md_path: str, *, url: str = "/book") -> list[dict[str, str]]:
  with open(page_md_path, encoding="utf-8") as handle:
    markdown = handle.read()

  return [
    {
      "id": _section_id(title),
      "title": title,
      "content": content,
      "type": "chapter",
      "url": url,
    }
    for title, content in _parse_sections(markdown)
  ]


def write_search_index(page_md_path: str, output_path: str) -> int:
  entries = build_search_index(page_md_path)
  os.makedirs(os.path.dirname(output_path), exist_ok=True)
  with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(entries, handle, indent=2, ensure_ascii=False)
    handle.write("\n")
  return len(entries)


def main() -> None:
  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.dirname(script_dir)
  page_md = os.path.join(root_dir, "marketing", "src", "assets", "content", "page.md")
  output = os.path.join(root_dir, "marketing", "public", "assets", "content", "search-index.json")

  if not os.path.exists(page_md):
    raise SystemExit(f"page.md missing: {page_md}")

  count = write_search_index(page_md, output)
  print(f"Built search-index.json ({count} sections) at {output}")


if __name__ == "__main__":
  main()

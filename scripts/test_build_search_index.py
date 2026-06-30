"""Tests for search-index generation."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from build_search_index import build_search_index, write_search_index


def test_build_search_index_parses_sections() -> None:
  markdown = """## Introduction

Intro body.

## Appendix K: Platform Maintenance Log

| Date | Tooling |
| 2026-06-30 | **Cursor - Grok 4.3** |
"""
  with tempfile.NamedTemporaryFile(
    mode="w", suffix=".md", delete=False, encoding="utf-8"
  ) as handle:
    handle.write(markdown)
    path = handle.name

  entries = build_search_index(path)
  assert len(entries) == 2
  assert entries[0]["title"] == "Introduction"
  assert entries[1]["title"].startswith("Appendix K")
  assert "Cursor - Grok 4.3" in entries[1]["content"]
  assert entries[0]["url"] == "/book"
  assert entries[0]["type"] == "chapter"


def test_write_search_index_writes_json() -> None:
  markdown = "## Quick Links\n\n- [Book](/book)\n"
  with tempfile.TemporaryDirectory() as tmp:
    page = Path(tmp) / "page.md"
    out = Path(tmp) / "search-index.json"
    page.write_text(markdown, encoding="utf-8")
    count = write_search_index(str(page), str(out))
    assert count == 1
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data[0]["title"] == "Quick Links"

#!/usr/bin/env python3
"""Strip dead mat-icon rules and orphan settings layout SCSS after viking-ui page-shell migration."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "src" / "app" / "pages"

MAT_ICON_BLOCK = re.compile(
  r"\n\s*mat-icon\s*\{[^}]*\}",
  re.MULTILINE,
)

# Nested mat-icon inside selectors: `.foo mat-icon { ... }`
NESTED_MAT_ICON = re.compile(
  r"\n\s+mat-icon\s*\{[^}]*\}",
  re.MULTILINE,
)


def strip_mat_icon(content: str) -> str:
  prev = None
  while prev != content:
    prev = content
    content = MAT_ICON_BLOCK.sub("", content)
    content = NESTED_MAT_ICON.sub("", content)
  return content


def strip_vulnerabilities_shell(content: str) -> str:
  """Remove metric/panel shell blocks now in viking-ui page-shell.scss."""
  # Drop hud-metrics through end of panel-header block
  start = content.find(".hud-metrics {")
  end = content.find("/* Filters */")
  if start != -1 and end != -1 and end > start:
    content = content[:start] + content[end:]
  return content


def strip_settings_orphans(content: str) -> str:
  """Remove unused sidebar layout SCSS (settings.html uses global HUD shell)."""
  start = content.find(".settings-container {")
  end = content.find(".settings-stack,")
  if start != -1 and end != -1 and end > start:
    content = content[:start] + content[end:]
  return content


def strip_status_topbar_dup(content: str) -> str:
  """Remove topbar/card shell duplicated in page-shell.scss."""
  for block_start in (
    ".dashboard-topbar {",
    ".page-title {",
    ".page-description {",
    ".status-card-outlined {",
    ".card-header-clean {",
    ".card-body-clean {",
  ):
    while block_start in content:
      idx = content.find(block_start)
      depth = 0
      i = idx
      while i < len(content):
        if content[i] == "{":
          depth += 1
        elif content[i] == "}":
          depth -= 1
          if depth == 0:
            content = content[:idx] + content[i + 1 :]
            break
        i += 1
      else:
        break
  return content


def strip_unused_settings_blocks(content: str) -> str:
  """Remove SCSS blocks not referenced in settings.html."""
  dead_selectors = (
    ".danger-zone-card",
    ".mfa-inline-form",
    ".mfa-input-full",
    ".mfa-step-title",
    ".mfa-info-inline",
    ".mfa-icon-inline",
    ".mfa-info-group",
    ".mfa-status-enrolled",
    ".mfa-status-desc",
  )
  for selector in dead_selectors:
    token = f"{selector} {{"
    while token in content:
      idx = content.find(token)
      depth = 0
      i = idx
      while i < len(content):
        if content[i] == "{":
          depth += 1
        elif content[i] == "}":
          depth -= 1
          if depth == 0:
            content = content[:idx] + content[i + 1 :]
            break
        i += 1
      else:
        break
  # Drop orphaned danger-zone media-query hook
  content = content.replace(
    "  .danger-zone-card .card-body-clean {\n"
    "    flex-direction: row;\n"
    "    align-items: center;\n"
    "    justify-content: space-between;\n"
    "    gap: 16px;\n"
    "    padding: 24px 32px;\n\n"
    "    button {\n"
    "      width: auto;\n"
    "      white-space: nowrap !important;\n"
    "      flex-shrink: 0;\n"
    "    }\n"
    "  }\n",
    "",
  )
  # mfa-btn rules are merged with save-settings-btn — keep save-settings-btn only
  content = content.replace(",\n.mfa-btn", "")
  content = content.replace("  .mfa-btn", "  .save-settings-btn")
  return content


def main() -> None:
  vuln = PAGES / "vulnerabilities" / "vulnerabilities.scss"
  settings = PAGES / "settings" / "settings.scss"
  status = PAGES / "status" / "status.scss"

  vuln.write_text(
    strip_vulnerabilities_shell(strip_mat_icon(vuln.read_text())),
    encoding="utf-8",
  )
  settings.write_text(
    strip_unused_settings_blocks(strip_settings_orphans(strip_mat_icon(settings.read_text()))),
    encoding="utf-8",
  )
  status.write_text(
    strip_status_topbar_dup(strip_mat_icon(status.read_text())),
    encoding="utf-8",
  )

  print("SCSS burndown complete:")
  for path in (vuln, settings, status):
    lines = path.read_text().count("\n") + 1
    print(f"  {path.relative_to(ROOT)} — {lines} lines")


if __name__ == "__main__":
  main()

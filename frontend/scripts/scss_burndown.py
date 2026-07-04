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


def strip_vulnerabilities_loader_dup(content: str) -> str:
  """Remove loader/spinner blocks now in viking-ui page-shell.scss."""
  for selector in (".loader-state {", ".spinner {"):
    while selector in content:
      idx = content.find(selector)
      depth = 0
      i = idx
      while i < len(content):
        if content[i] == "{":
          depth += 1
        elif content[i] == "}":
          depth -= 1
          if depth == 0:
            # Drop trailing @keyframes spin if immediately after spinner block
            tail = content[i + 1 :]
            if selector == ".spinner {" and "@keyframes spin" in tail[:200]:
              kf_start = content.find("@keyframes spin", i + 1)
              kf_end = content.find("}", kf_start) + 1
              content = content[:idx] + content[kf_end:]
            else:
              content = content[:idx] + content[i + 1 :]
            break
        i += 1
      else:
        break
  return content


def tokenize_rgba_burndown(content: str) -> str:
  """Replace common rgba washes with Viking token color-mix."""
  replacements = (
    ("rgba(0, 0, 0, 0.15)", "color-mix(in srgb, var(--viking-black) 15%, transparent)"),
    ("rgba(255, 255, 255, 0.01)", "color-mix(in srgb, var(--viking-white) 1%, transparent)"),
    ("rgba(255, 255, 255, 0.02)", "color-mix(in srgb, var(--viking-white) 2%, transparent)"),
    ("rgba(255, 255, 255, 0.05)", "color-mix(in srgb, var(--viking-white) 5%, transparent)"),
    ("rgba(255, 255, 255, 0.08)", "color-mix(in srgb, var(--viking-white) 8%, transparent)"),
    ("rgba(255, 255, 255, 0.1)", "color-mix(in srgb, var(--viking-white) 10%, transparent)"),
    ("rgba(255, 255, 255, 0.15)", "color-mix(in srgb, var(--viking-white) 15%, transparent)"),
    ("rgba(255, 255, 255, 0.25)", "color-mix(in srgb, var(--viking-white) 25%, transparent)"),
    ("rgba(255, 255, 255, 0.3)", "color-mix(in srgb, var(--viking-white) 30%, transparent)"),
    ("rgba(192, 197, 193, 0.08)", "color-mix(in srgb, var(--viking-surface-alt) 8%, transparent)"),
    ("rgba(225, 230, 226, 0.8)", "color-mix(in srgb, var(--viking-surface) 80%, transparent)"),
    ("border-radius: 999px", "border-radius: var(--viking-radius-pill, 999px)"),
    ("border-radius: 8px", "border-radius: var(--viking-radius, 8px)"),
  )
  for old, new in replacements:
    content = content.replace(old, new)
  return content


def strip_settings_shell_dup(content: str) -> str:
  """Collapse duplicate status-card shell — base lives in page-shell.scss."""
  old_shell = """/* Outlined Content Card — extends viking-ui page-shell with card-header spacing */
.status-card-outlined {
  position: relative;
  background: var(--viking-surface);
  border: 1px solid var(--viking-border);
  border-radius: var(--viking-radius-lg);
  box-shadow: var(--viking-shadow-sm);
  padding: var(--viking-space-3, 24px);
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-2, 16px);

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--viking-metallic-200) 18%, transparent),
      transparent
    );
    pointer-events: none;
    z-index: 1;
  }
}

.card-header-clean {
  padding: 0 0 var(--viking-space-2, 16px) 0;
  border-bottom: 1px solid var(--viking-border-subtle);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--viking-space-2, 16px);
  flex-wrap: nowrap;

  .card-title-main {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .delete-page-btn {
    align-self: center;
    margin-left: 0;
    flex-shrink: 0;
  }
}

.card-body-clean {
  padding: 0;
}

"""
  new_shell = """/* Outlined card — shell from page-shell.scss; settings-specific rhythm only */
.status-card-outlined {
  padding: var(--viking-space-3, 24px);
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-2, 16px);
}

.card-header-clean {
  padding: 0 0 var(--viking-space-2, 16px) 0;
  border-bottom: 1px solid var(--viking-border-subtle);

  .card-title-main {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .delete-page-btn {
    align-self: center;
    margin-left: 0;
    flex-shrink: 0;
  }
}

.card-body-clean {
  padding: 0;
}

"""
  if old_shell in content:
    content = content.replace(old_shell, new_shell)
  # Drop duplicate second card-body-clean padding block
  content = content.replace(
    ".card-body-clean {\n  padding: var(--card-padding);\n}\n\n",
    "",
  )
  return content


def main() -> None:
  vuln = PAGES / "vulnerabilities" / "vulnerabilities.scss"
  settings = PAGES / "settings" / "settings.scss"
  dashboard = PAGES / "dashboard" / "dashboard.scss"
  status = PAGES / "status" / "status.scss"

  vuln.write_text(
    tokenize_rgba_burndown(
      strip_vulnerabilities_loader_dup(
        strip_vulnerabilities_shell(strip_mat_icon(vuln.read_text()))
      )
    ),
    encoding="utf-8",
  )
  settings.write_text(
    tokenize_rgba_burndown(
      strip_settings_shell_dup(
        strip_unused_settings_blocks(strip_settings_orphans(strip_mat_icon(settings.read_text())))
      )
    ),
    encoding="utf-8",
  )
  dashboard.write_text(
    tokenize_rgba_burndown(strip_mat_icon(dashboard.read_text())),
    encoding="utf-8",
  )
  status.write_text(
    strip_status_topbar_dup(strip_mat_icon(status.read_text())),
    encoding="utf-8",
  )

  print("SCSS burndown complete:")
  for path in (vuln, settings, dashboard, status):
    lines = path.read_text().count("\n") + 1
    print(f"  {path.relative_to(ROOT)} — {lines} lines")


if __name__ == "__main__":
  main()

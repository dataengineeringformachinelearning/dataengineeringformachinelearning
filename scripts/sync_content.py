import os


def _mtime(path: str) -> float:
  try:
    return os.path.getmtime(path)
  except OSError:
    return 0.0


def _needs_sync(sources: list[str], destinations: list[str]) -> bool:
  """Skip heavy sync when no source is newer than any destination."""
  source_mtime = max((_mtime(src) for src in sources if os.path.exists(src)), default=0.0)
  if source_mtime == 0.0:
    return False
  dest_mtimes = [_mtime(dst) for dst in destinations if os.path.exists(dst)]
  if not dest_mtimes:
    return True
  return source_mtime > min(dest_mtimes)


def sync_readme():
  # Get the directory where the script is located (scripts folder)
  script_dir = os.path.dirname(os.path.abspath(__file__))
  # Get the root directory (one level up)
  root_dir = os.path.dirname(script_dir)

  book_path = os.path.join(root_dir, "BOOK.md")
  readme_path = os.path.join(root_dir, "README.md")

  llms_path = os.path.join(root_dir, "frontend", "public", "llms.txt")

  marketing_page_md_path = os.path.join(
    root_dir, "marketing", "src", "assets", "content", "page.md"
  )
  marketing_readme_md_path = os.path.join(
    root_dir, "marketing", "src", "assets", "content", "readme.md"
  )
  marketing_whitepaper_md_path = os.path.join(
    root_dir, "marketing", "src", "assets", "content", "whitepaper.md"
  )
  whitepaper_path = os.path.join(root_dir, "WHITEPAPER.md")

  try:
    # --- 1. Process BOOK.md for page.md ---
    with open(book_path, encoding="utf-8") as f:
      book_lines = f.readlines()

    # Find the index of the first line starting with "## Introduction" (or "## Chapter" as fallback)
    start_idx = 0
    for idx, line in enumerate(book_lines):
      if line.startswith("## Introduction") or line.startswith("## Chapter"):
        start_idx = idx
        break

    book_content = "".join(book_lines[start_idx:])

    os.makedirs(os.path.dirname(marketing_page_md_path), exist_ok=True)

    with open(marketing_page_md_path, "w", encoding="utf-8") as f:
      f.write(book_content)

    # --- 2. Process README.md for readme.md ---
    with open(readme_path, encoding="utf-8") as f:
      readme_content = f.read()

    os.makedirs(os.path.dirname(marketing_readme_md_path), exist_ok=True)
    with open(marketing_readme_md_path, "w", encoding="utf-8") as f:
      f.write(readme_content)

    # --- 2b. Process WHITEPAPER.md for whitepaper.md ---
    whitepaper_content = ""
    if os.path.exists(whitepaper_path):
      with open(whitepaper_path, encoding="utf-8") as f:
        whitepaper_content = f.read()
      os.makedirs(os.path.dirname(marketing_whitepaper_md_path), exist_ok=True)
      with open(marketing_whitepaper_md_path, "w", encoding="utf-8") as f:
        f.write(whitepaper_content)

    print("Successfully synced markdown content to:")
    print(f" - {marketing_page_md_path}")
    print(f" - {marketing_readme_md_path}")
    if whitepaper_content:
      print(f" - {marketing_whitepaper_md_path}")

    # --- llms.txt (marketing; optional frontend if present) ---
    marketing_llms_path = os.path.join(root_dir, "marketing", "public", "llms.txt")
    marketing_llms = """# Data Engineering for Machine Learning

Community site for the open book, whitepaper, blog, docs, and legal pages around DEML.

## Homepage
/

## Book
/book

## Whitepaper
/whitepaper

## Documentation
/documentation

## Blog
/blog

## Compliance
/compliance

## Privacy
/privacy/

## Terms
/terms/

## Repository
https://github.com/dataengineeringformachinelearning/dataengineeringformachinelearning

## Related
- Product (deml.app): https://github.com/dataengineeringformachinelearning/deml
- Streaming API (FORJD): https://github.com/dataengineeringformachinelearning/forjd

## Notes
- Community, learning, blog, and developer docs live here; product UI at https://deml.app
- Prefer the Book and `/documentation` for operator-facing guidance.
- Blog moved from deml.app — use `/blog` (deml.app/blog redirects here).
"""
    os.makedirs(os.path.dirname(marketing_llms_path), exist_ok=True)
    with open(marketing_llms_path, "w", encoding="utf-8") as f:
      f.write(marketing_llms)
    print(f" - {marketing_llms_path}")
    if os.path.isdir(os.path.dirname(llms_path)):
      with open(llms_path, "w", encoding="utf-8") as f:
        f.write(marketing_llms)
      print(f" - {llms_path}")

  except Exception as e:
    print(f"Error syncing markdown content: {e}")
    raise


def sync_version():
  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.dirname(script_dir)

  version_path = os.path.join(root_dir, "version.txt")
  if not os.path.exists(version_path):
    print("sync_content: version.txt absent — skip (control-plane versions live in deml)")
    return

  targets = [
    p
    for p in (
      os.path.join(root_dir, "frontend", "version.txt"),
      os.path.join(root_dir, "backend", "version.txt"),
    )
    if os.path.isdir(os.path.dirname(p))
  ]
  if not targets:
    print("sync_content: no frontend/backend trees — skip version fan-out")
    return

  try:
    with open(version_path, encoding="utf-8") as f:
      version_data = f.read().strip()
    for p in targets:
      with open(p, "w", encoding="utf-8") as f:
        f.write(f"{version_data}\n")
      print(f"Successfully synced version {version_data} to {p}")
  except Exception as e:
    print(f"Error syncing version.txt: {e}")


def sync_search_index():
  """No-op: marketing search-index / Algolia assets were removed."""
  print("sync_content: search index sync disabled — skip")


if __name__ == "__main__":
  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.dirname(script_dir)

  book_path = os.path.join(root_dir, "BOOK.md")
  readme_path = os.path.join(root_dir, "README.md")
  version_path = os.path.join(root_dir, "version.txt")
  whitepaper_path = os.path.join(root_dir, "WHITEPAPER.md")

  content_dests = [
    os.path.join(root_dir, "marketing", "src", "assets", "content", "page.md"),
    os.path.join(root_dir, "marketing", "src", "assets", "content", "readme.md"),
    os.path.join(root_dir, "marketing", "src", "assets", "content", "whitepaper.md"),
    os.path.join(root_dir, "marketing", "public", "llms.txt"),
  ]

  if _needs_sync([book_path, readme_path, whitepaper_path], content_dests):
    sync_readme()
  else:
    print("sync_content: sources unchanged — skipping BOOK/README/WHITEPAPER propagation")

  sync_version()

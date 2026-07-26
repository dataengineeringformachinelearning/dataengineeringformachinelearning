import glob
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
  llms_full_path = os.path.join(root_dir, "frontend", "public", "llms-full.txt")

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

    # --- 3. Process LLMS-full.txt ---
    llms_full_content = readme_content + "\n\n"

    # Concatenate operational and integration docs
    for rel_path in ["docs/conops.md"]:
      extra_path = os.path.join(root_dir, rel_path)
      if os.path.exists(extra_path):
        with open(extra_path, encoding="utf-8") as f:
          llms_full_content += f.read() + "\n\n"

    integrations_dir = os.path.join(root_dir, "docs", "integrations")
    if os.path.exists(integrations_dir):
      for md_file in glob.glob(os.path.join(integrations_dir, "*.md")):
        with open(md_file, encoding="utf-8") as f:
          llms_full_content += f.read() + "\n\n"

    # Add BOOK.md
    llms_full_content += "".join(book_lines)

    if whitepaper_content:
      llms_full_content += "\n\n" + whitepaper_content

    # Community repo: marketing only (control-plane frontend lives in deml)
    marketing_llms_full_path = os.path.join(root_dir, "marketing", "public", "llms-full.txt")
    os.makedirs(os.path.dirname(marketing_llms_full_path), exist_ok=True)
    llms_full_targets = [marketing_llms_full_path]
    if os.path.isdir(os.path.dirname(llms_full_path)):
      llms_full_targets.append(llms_full_path)
    for path in llms_full_targets:
      with open(path, "w", encoding="utf-8") as f:
        f.write(llms_full_content)

    print("Successfully synced markdown content to:")
    for path in llms_full_targets:
      print(f" - {path}")
    print(f" - {marketing_page_md_path}")
    print(f" - {marketing_readme_md_path}")
    if whitepaper_content:
      print(f" - {marketing_whitepaper_md_path}")

    # --- llms.txt (marketing; optional frontend if present) ---
    marketing_llms_path = os.path.join(root_dir, "marketing", "public", "llms.txt")
    marketing_llms = """# Data Engineering for Machine Learning

Community site, BOOK, and public documentation for the DEML ecosystem.

## Homepage
/

## Repository
https://github.com/dataengineeringformachinelearning/dataengineeringformachinelearning

## Related
- Control plane (deml.app): https://github.com/dataengineeringformachinelearning/deml
- Data plane (forjd.co): https://github.com/dataengineeringformachinelearning/forjd
- Full book for LLMs: /llms-full.txt

## Notes
- Marketing site (this domain); Angular app at https://deml.app; backend at https://backend.deml.app
- Prefer the repository README for the most complete community documentation.
"""
    os.makedirs(os.path.dirname(marketing_llms_path), exist_ok=True)
    with open(marketing_llms_path, "w", encoding="utf-8") as f:
      f.write(marketing_llms)
    print(f" - {marketing_llms_path}")
    if os.path.isdir(os.path.dirname(llms_path)):
      with open(llms_path, "w", encoding="utf-8") as f:
        f.write(marketing_llms)
      print(f" - {llms_path}")

    # Sync AGENTS.md when present (control-plane AGENTS lives in deml)
    agents_src = os.path.join(root_dir, "AGENTS.md")
    agents_dest = os.path.join(root_dir, "marketing", "public", "AGENTS.md")
    if os.path.exists(agents_src):
      with open(agents_src, encoding="utf-8") as f:
        agents_content = f.read()
      with open(agents_dest, "w", encoding="utf-8") as f:
        f.write(agents_content)
      print(f" - {agents_dest}")

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
  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.dirname(script_dir)
  page_md = os.path.join(root_dir, "marketing", "src", "assets", "content", "page.md")
  dest_dir = os.path.join(root_dir, "marketing", "public", "assets", "content")
  dest = os.path.join(dest_dir, "search-index.json")
  builder = os.path.join(script_dir, "build_search_index.py")

  if not os.path.exists(page_md):
    print(f"search-index source missing: {page_md}")
    return
  if not os.path.exists(builder):
    print("sync_content: build_search_index.py absent — skip search index (lives in deml)")
    return

  import sys

  if script_dir not in sys.path:
    sys.path.insert(0, script_dir)
  from build_search_index import write_search_index

  os.makedirs(dest_dir, exist_ok=True)
  count = write_search_index(page_md, dest)
  print(f"Rebuilt search-index.json ({count} sections) at {dest}")


if __name__ == "__main__":
  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.dirname(script_dir)

  book_path = os.path.join(root_dir, "BOOK.md")
  readme_path = os.path.join(root_dir, "README.md")
  version_path = os.path.join(root_dir, "version.txt")
  agents_path = os.path.join(root_dir, "AGENTS.md")
  whitepaper_path = os.path.join(root_dir, "WHITEPAPER.md")

  content_dests = [
    os.path.join(root_dir, "marketing", "src", "assets", "content", "page.md"),
    os.path.join(root_dir, "marketing", "src", "assets", "content", "readme.md"),
    os.path.join(root_dir, "marketing", "src", "assets", "content", "whitepaper.md"),
    os.path.join(root_dir, "marketing", "public", "llms-full.txt"),
    os.path.join(root_dir, "marketing", "public", "llms.txt"),
  ]

  if _needs_sync([book_path, readme_path, agents_path, whitepaper_path], content_dests):
    sync_readme()
    sync_search_index()
  else:
    print("sync_content: sources unchanged — skipping BOOK/README/AGENTS propagation")

  sync_version()

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

    marketing_llms_full_path = os.path.join(root_dir, "marketing", "public", "llms-full.txt")
    os.makedirs(os.path.dirname(marketing_llms_full_path), exist_ok=True)
    for path in [llms_full_path, marketing_llms_full_path]:
      with open(path, "w", encoding="utf-8") as f:
        f.write(llms_full_content)

    print("Successfully synced markdown content to:")
    print(f" - {llms_full_path} & {marketing_llms_full_path}")
    print(f" - {marketing_page_md_path}")
    print(f" - {marketing_readme_md_path}")
    if whitepaper_content:
      print(f" - {marketing_whitepaper_md_path}")

    # Sync llms.txt for frontend and marketing (site-specific headers)
    marketing_llms_path = os.path.join(root_dir, "marketing", "public", "llms.txt")
    frontend_llms = """# Data Engineering for AI Engineering and Cybersecurity (DEML APP)

Developer Portal, API Gateway, and the Book on Data Engineering for AI Engineering and Cybersecurity by Joe Alongi.

## Homepage
/

## Repository
https://github.com/joealongi/dataengineeringformachinelearning

## Agent & MCP Settings
- AGENTS.md (coding principles): https://github.com/joealongi/dataengineeringformachinelearning/blob/main/AGENTS.md
- THEME.md (Viking-UI design system): https://github.com/joealongi/dataengineeringformachinelearning/blob/main/THEME.md
- MCP servers: Hugging Face, Sentry, Sanity, Stripe, Firebase (see Cursor MCP settings)
- Full book for LLMs: /llms-full.txt

## Notes
- This site is the DEML Angular application (deml.app).
- Backend API: https://backend.deml.app/api/v1/docs
- Marketing site: https://dataengineeringformachinelearning.com
"""
    marketing_llms = """# Data Engineering for AI Engineering and Cybersecurity

Developer Portal, API Gateway, and the Book on Data Engineering for AI Engineering and Cybersecurity by Joe Alongi.

## Homepage
/

## Repository
https://github.com/joealongi/dataengineeringformachinelearning

## Agent & MCP Settings
- AGENTS.md (coding principles): /AGENTS.md
- THEME.md (Viking-UI design system): https://github.com/joealongi/dataengineeringformachinelearning/blob/main/THEME.md
- MCP servers: Hugging Face, Sentry, Sanity, Stripe, Firebase (see Cursor MCP settings)
- Full book for LLMs: /llms-full.txt

## Notes
- Marketing site (this domain); Angular app at https://deml.app; backend at https://backend.deml.app
- Public API demo: https://backend.deml.app/api/v1/docs (ingest/predict with `deml_swagger_api_key`)
- Prefer the repository README for the most complete project documentation.
"""
    for path, content in [(llms_path, frontend_llms), (marketing_llms_path, marketing_llms)]:
      with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f" - {llms_path} & {marketing_llms_path}")

    # Sync AGENTS.md for LLM discoverability on marketing site
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


def sync_version():
  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.dirname(script_dir)

  version_path = os.path.join(root_dir, "version.txt")
  frontend_version_path = os.path.join(root_dir, "frontend", "version.txt")
  backend_version_path = os.path.join(root_dir, "backend", "version.txt")

  if os.path.exists(version_path):
    try:
      with open(version_path, encoding="utf-8") as f:
        version_data = f.read().strip()

      for p in [frontend_version_path, backend_version_path]:
        with open(p, "w", encoding="utf-8") as f:
          f.write(f"{version_data}\n")
      print(f"Successfully synced version {version_data} to:")
      print(f" - {frontend_version_path}")
      print(f" - {backend_version_path}")
    except Exception as e:
      print(f"Error syncing version.txt: {e}")


def sync_search_index():
  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.dirname(script_dir)
  page_md = os.path.join(root_dir, "marketing", "src", "assets", "content", "page.md")
  dest_dir = os.path.join(root_dir, "marketing", "public", "assets", "content")
  dest = os.path.join(dest_dir, "search-index.json")

  if os.path.exists(page_md):
    import sys

    if script_dir not in sys.path:
      sys.path.insert(0, script_dir)
    from build_search_index import write_search_index

    count = write_search_index(page_md, dest)
    print(f"Rebuilt search-index.json ({count} sections) at {dest}")
  else:
    print(f"search-index source missing: {page_md}")
    return


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
    os.path.join(root_dir, "frontend", "public", "llms-full.txt"),
    os.path.join(root_dir, "marketing", "public", "llms-full.txt"),
    os.path.join(root_dir, "frontend", "public", "llms.txt"),
    os.path.join(root_dir, "marketing", "public", "llms.txt"),
    os.path.join(root_dir, "marketing", "public", "AGENTS.md"),
    os.path.join(root_dir, "marketing", "public", "assets", "content", "search-index.json"),
    os.path.join(root_dir, "frontend", "version.txt"),
    os.path.join(root_dir, "backend", "version.txt"),
  ]

  if _needs_sync([book_path, readme_path, agents_path, whitepaper_path], content_dests):
    sync_readme()
    sync_search_index()
  else:
    print("sync_content: sources unchanged — skipping BOOK/README/AGENTS propagation")

  if _needs_sync([version_path], content_dests[-2:]):
    sync_version()
  else:
    print("sync_content: version.txt unchanged — skipping version sync")

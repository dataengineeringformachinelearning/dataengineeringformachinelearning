import glob
import os


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

    marketing_llms_full_path = os.path.join(root_dir, "marketing", "public", "llms-full.txt")
    os.makedirs(os.path.dirname(marketing_llms_full_path), exist_ok=True)
    for path in [llms_full_path, marketing_llms_full_path]:
      with open(path, "w", encoding="utf-8") as f:
        f.write(llms_full_content)

    print("Successfully synced markdown content to:")
    print(f" - {llms_full_path} & {marketing_llms_full_path}")
    print(f" - {marketing_page_md_path}")
    print(f" - {marketing_readme_md_path}")

    # Also sync llms.txt description if present
    if os.path.exists(llms_path):
      with open(llms_path, encoding="utf-8") as f:
        llms_lines = f.readlines()

      # Update line 3/description to the new style
      if len(llms_lines) >= 3:
        llms_lines[2] = (
          "Developer Portal, API Gateway, and the Book on Data Engineering for Machine Learning by Joe Alongi.\n"
        )
        marketing_llms_path = os.path.join(root_dir, "marketing", "public", "llms.txt")
        for path in [llms_path, marketing_llms_path]:
          with open(path, "w", encoding="utf-8") as f:
            f.writelines(llms_lines)
        print(f" - {llms_path} & {marketing_llms_path}")

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
  sync_readme()
  sync_version()
  sync_search_index()

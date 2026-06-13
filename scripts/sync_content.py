import os


def sync_readme():
  # Get the directory where the script is located (scripts folder)
  script_dir = os.path.dirname(os.path.abspath(__file__))
  # Get the root directory (one level up)
  root_dir = os.path.dirname(script_dir)

  readme_path = os.path.join(root_dir, "README.md")
  llms_path = os.path.join(root_dir, "frontend", "public", "llms.txt")
  llms_full_path = os.path.join(root_dir, "frontend", "public", "llms-full.txt")
  page_md_path = os.path.join(root_dir, "frontend", "src", "assets", "content", "page.md")

  try:
    with open(readme_path, encoding="utf-8") as f:
      lines = f.readlines()

    # Find the index of the first line starting with "## Chapter"
    start_idx = 0
    for idx, line in enumerate(lines):
      if line.startswith("## Chapter"):
        start_idx = idx
        break

    content = "".join(lines[start_idx:])

    with open(llms_full_path, "w", encoding="utf-8") as f:
      f.write(content)

    with open(page_md_path, "w", encoding="utf-8") as f:
      f.write(content)

    print(f"Successfully synced {readme_path} to:")
    print(f" - {llms_full_path}")
    print(f" - {page_md_path}")

    # Also sync llms.txt description if present
    if os.path.exists(llms_path):
      with open(llms_path, encoding="utf-8") as f:
        llms_lines = f.readlines()

      # Update line 3/description to the new style
      if len(llms_lines) >= 3:
        llms_lines[2] = (
          "Working notes and book prototypes on Data Engineering for Machine Learning by Joe Alongi.\n"
        )
        with open(llms_path, "w", encoding="utf-8") as f:
          f.writelines(llms_lines)
        print(f" - {llms_path}")

  except Exception as e:
    print(f"Error syncing README.md: {e}")


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


if __name__ == "__main__":
  sync_readme()
  sync_version()

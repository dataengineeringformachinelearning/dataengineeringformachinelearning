import os

def sync_readme():
    # Get the directory where the script is located (scripts folder)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Get the root directory (one level up)
    root_dir = os.path.dirname(script_dir)

    readme_path = os.path.join(root_dir, 'README.md')
    llms_full_path = os.path.join(root_dir, 'frontend', 'public', 'llms-full.txt')
    page_md_path = os.path.join(root_dir, 'frontend', 'src', 'assets', 'content', 'page.md')

    try:
        with open(readme_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Skip the first 4 lines (Title and description)
        if len(lines) > 4:
            content = "".join(lines[4:])
        else:
            content = "".join(lines)

        with open(llms_full_path, 'w', encoding='utf-8') as f:
            f.write(content)

        with open(page_md_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"Successfully synced {readme_path} to:")
        print(f" - {llms_full_path}")
        print(f" - {page_md_path}")
    except Exception as e:
        print(f"Error syncing README.md: {e}")

if __name__ == '__main__':
    sync_readme()

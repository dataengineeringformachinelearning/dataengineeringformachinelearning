import os
import re

directory = "frontend/src"


def remove_glow_spheres_html(content):
  return re.sub(r"<div[^>]*glow-sphere[^>]*>.*?</div>\n?", "", content, flags=re.DOTALL)


def remove_glow_spheres_scss(content):
  # Match .glow-sphere { ... } and .error-glow-sphere { ... } and .cta-glow-sphere { ... }
  # Using a simple brace matching logic or regex if they don't have nested braces.
  # Since SCSS can have nested braces, a simple regex might fail.
  # Let's just do it cleanly.
  pass


for root, _, files in os.walk(directory):
  for file in files:
    if file.endswith(".html"):
      filepath = os.path.join(root, file)
      with open(filepath) as f:
        content = f.read()
      new_content = remove_glow_spheres_html(content)
      if new_content != content:
        with open(filepath, "w") as f:
          f.write(new_content)
        print(f"Updated HTML: {filepath}")

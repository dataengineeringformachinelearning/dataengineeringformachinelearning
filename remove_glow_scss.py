import os
import re

directory = "frontend/src"


def remove_blocks(content, class_name):
  pattern = re.compile(rf"{class_name}\s*{{")

  while True:
    match = pattern.search(content)
    if not match:
      break

    start_idx = match.start()
    # Find the matching closing brace
    brace_count = 0
    in_block = False
    end_idx = start_idx

    for i in range(start_idx, len(content)):
      if content[i] == "{":
        brace_count += 1
        in_block = True
      elif content[i] == "}":
        brace_count -= 1
        if in_block and brace_count == 0:
          end_idx = i + 1
          break

    if end_idx > start_idx:
      # Check if there is a preceding line with a comma, or just remove the block
      content = content[:start_idx] + content[end_idx:]
    else:
      break

  return content


for root, _, files in os.walk(directory):
  for file in files:
    if file.endswith(".scss"):
      filepath = os.path.join(root, file)
      with open(filepath) as f:
        content = f.read()

      orig = content
      content = remove_blocks(content, r"\.glow-sphere")
      content = remove_blocks(content, r"\.error-glow-sphere")
      content = remove_blocks(content, r"\.cta-glow-sphere")

      # Remove any trailing commas that might have been left if glow-sphere was part of a list
      content = re.sub(r",\s*\.glow-sphere\b", "", content)

      if content != orig:
        with open(filepath, "w") as f:
          f.write(content)
        print(f"Updated SCSS: {filepath}")

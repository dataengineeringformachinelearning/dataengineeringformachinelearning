import re


def rewrite(file_path):
  with open(file_path) as f:
    content = f.read()

  lines = content.split("\n")
  new_lines = []

  in_code_block = False

  for line in lines:
    if line.startswith("```"):
      in_code_block = not in_code_block
      new_lines.append(line)
      continue

    if in_code_block:
      new_lines.append(line)
      continue

    # Replace first-person singular and plural with corporate third-person
    line = re.sub(
      r"\bI\b (have found|find|treat|heavily rely|define|strongly recommend|introduce|architect|select|utilize|manage|configure|engineer)",
      "It is found",
      line,
    )
    line = re.sub(r"\bI\b (am|was)", "The system is", line)
    line = re.sub(r"\bI\b ", "The architecture ", line)
    line = re.sub(r"\bmy\b", "the", line)
    line = re.sub(r"\bMy\b", "The", line)
    line = re.sub(r"\bme\b", "the user", line)

    line = re.sub(
      r"\bwe (must|will|can|could|should|would|have|need)\b",
      lambda m: f"the system {m.group(1)}",
      line,
      flags=re.IGNORECASE,
    )
    line = re.sub(r"\bWe\b", "The system", line)
    line = re.sub(r"\bwe\b", "the system", line)
    line = re.sub(r"\bour\b", "the", line, flags=re.IGNORECASE)
    line = re.sub(r"\bus\b", "users", line, flags=re.IGNORECASE)

    # Fix capitalization from lowercase "the" at start of sentences
    line = re.sub(r"(^\s*)([a-z])", lambda m: m.group(1) + m.group(2).upper(), line)
    line = re.sub(r"(\.\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), line)

    new_lines.append(line)

  with open(file_path, "w") as f:
    f.write("\n".join(new_lines))


rewrite("frontend/src/assets/content/page.md")

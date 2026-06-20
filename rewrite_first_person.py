import re


def rewrite(file_path):
  with open(file_path) as f:
    content = f.read()

  # Split into lines
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

    # Regex replacements
    line = re.sub(
      r"\bWe (are|must|will|can|could|should|would|have|need)\b", lambda m: f"I {m.group(1)}", line
    )
    line = re.sub(
      r"\bwe (are|must|will|can|could|should|would|have|need)\b", lambda m: f"I {m.group(1)}", line
    )

    # Action verbs
    line = re.sub(r"\bWe ([a-z]+)\b", lambda m: f"I {m.group(1)}", line)
    line = re.sub(r"\bwe ([a-z]+)\b", lambda m: f"I {m.group(1)}", line)

    line = re.sub(r"\bOur\b", "My", line)
    line = re.sub(r"\bour\b", "my", line)

    line = re.sub(r"\bUs\b", "Me", line)
    line = re.sub(r"\bus\b", "me", line)

    # specific fixes for verbs that might end in 's' after 'we' replacement? Actually "I" doesn't take 's', "he/she/it" does. "We engineer" -> "I engineer", so the verb form is the same.

    new_lines.append(line)

  with open(file_path, "w") as f:
    f.write("\n".join(new_lines))


rewrite("README.md")
rewrite("frontend/src/assets/content/page.md")

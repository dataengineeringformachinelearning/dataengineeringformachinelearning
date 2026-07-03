import os
import shutil
import subprocess
import sys


def sync_design_system():
  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.dirname(script_dir)
  pkg_dir = os.path.join(root_dir, "packages", "deml-design-system")
  dist_dir = os.path.join(pkg_dir, "dist")

  if not os.path.isdir(pkg_dir):
    print(f"Design system package not found at {pkg_dir}", file=sys.stderr)
    sys.exit(1)

  print("Building @deml/design-system...")
  subprocess.run(["npm", "run", "build"], cwd=pkg_dir, check=True)

  frontend_dir = os.path.join(root_dir, "frontend")
  print("Building @dataengineeringformachinelearning/viking-ui CSS bundle...")
  subprocess.run(["npm", "run", "build:viking-ui-css"], cwd=frontend_dir, check=True)

  dist_tokens = os.path.join(dist_dir, "design-tokens.css")
  dist_components = os.path.join(dist_dir, "deml-components.css")

  # Match pre-commit prettier formatting so sync + prettier hooks do not fight.
  prettier_config = os.path.join(root_dir, "frontend", ".prettierrc")
  subprocess.run(
    [
      "npx",
      "-y",
      "prettier@3.8.2",
      "--config",
      prettier_config,
      "--write",
      dist_tokens,
      dist_components,
    ],
    check=True,
  )

  for path in (dist_tokens, dist_components):
    if not os.path.isfile(path):
      print(f"Expected build output missing: {path}", file=sys.stderr)
      sys.exit(1)

  token_targets = [
    os.path.join(root_dir, "frontend", "src", "assets", "design-tokens.css"),
    os.path.join(root_dir, "frontend", "public", "assets", "design-tokens.css"),
    os.path.join(root_dir, "backend", "static", "design-tokens.css"),
    os.path.join(root_dir, "marketing", "public", "assets", "design-tokens.css"),
  ]

  component_targets = [
    os.path.join(root_dir, "frontend", "src", "assets", "deml-components.css"),
    os.path.join(root_dir, "frontend", "public", "assets", "deml-components.css"),
    os.path.join(root_dir, "backend", "static", "deml-components.css"),
    os.path.join(root_dir, "marketing", "public", "assets", "deml-components.css"),
  ]

  viking_css_src = os.path.join(frontend_dir, "dist", "viking-ui-css", "viking-ui.css")
  viking_css_targets = [
    os.path.join(root_dir, "frontend", "src", "assets", "viking-ui.css"),
    os.path.join(root_dir, "frontend", "public", "assets", "viking-ui.css"),
    os.path.join(root_dir, "backend", "static", "viking-ui.css"),
    os.path.join(root_dir, "marketing", "public", "assets", "viking-ui.css"),
  ]

  for target in token_targets:
    os.makedirs(os.path.dirname(target), exist_ok=True)
    shutil.copy2(dist_tokens, target)

  for target in component_targets:
    os.makedirs(os.path.dirname(target), exist_ok=True)
    shutil.copy2(dist_components, target)

  if not os.path.isfile(viking_css_src):
    print(f"Expected viking-ui CSS missing: {viking_css_src}", file=sys.stderr)
    sys.exit(1)

  for target in viking_css_targets:
    os.makedirs(os.path.dirname(target), exist_ok=True)
    shutil.copy2(viking_css_src, target)

  scss_src = os.path.join(pkg_dir, "src")
  scss_target = os.path.join(root_dir, "frontend", "src", "design-system")
  if os.path.isdir(scss_src):
    shutil.copytree(scss_src, scss_target, dirs_exist_ok=True)

  print("Successfully synced design system to:")
  for target in token_targets + component_targets + viking_css_targets:
    print(f" - {target}")
  if os.path.isdir(scss_target):
    print(f" - {scss_target}")


if __name__ == "__main__":
  sync_design_system()

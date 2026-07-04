import os
import shutil
import subprocess
import sys


def sync_design_system() -> None:
  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.dirname(script_dir)
  docs_dir = os.path.join(root_dir, "viking-ui-docs")
  package_dir = os.path.join(root_dir, "packages", "viking-ui")
  dist_dir = os.path.join(package_dir, "dist")
  frontend_dir = os.path.join(root_dir, "frontend")

  print("Building canonical Viking-UI package artifacts...")
  subprocess.run(["npm", "run", "build"], cwd=package_dir, check=True)

  dist_tokens = os.path.join(dist_dir, "design-tokens.css")
  dist_viking_components = os.path.join(dist_dir, "viking-components.css")
  dist_components = os.path.join(dist_dir, "deml-components.css")
  dist_viking = os.path.join(dist_dir, "viking-ui.css")
  dist_elements = os.path.join(dist_dir, "viking-ui-elements.js")
  dist_tokens_json = os.path.join(dist_dir, "viking-tokens.json")
  docs_static_dir = os.path.join(docs_dir, "dist", "static-css")

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
      dist_viking_components,
      dist_components,
    ],
    check=True,
  )

  for path in (
    dist_tokens,
    dist_viking_components,
    dist_components,
    dist_viking,
    dist_elements,
    dist_tokens_json,
  ):
    if not os.path.isfile(path):
      print(f"Expected build output missing: {path}", file=sys.stderr)
      sys.exit(1)

  token_targets = [
    os.path.join(root_dir, "frontend", "src", "assets", "design-tokens.css"),
    os.path.join(root_dir, "frontend", "public", "assets", "design-tokens.css"),
    os.path.join(root_dir, "backend", "static", "design-tokens.css"),
    os.path.join(root_dir, "marketing", "public", "assets", "design-tokens.css"),
  ]

  viking_components_targets = [
    os.path.join(root_dir, "frontend", "src", "assets", "viking-components.css"),
    os.path.join(root_dir, "frontend", "public", "assets", "viking-components.css"),
    os.path.join(root_dir, "backend", "static", "viking-components.css"),
    os.path.join(root_dir, "marketing", "public", "assets", "viking-components.css"),
  ]

  component_targets = [
    os.path.join(root_dir, "frontend", "src", "assets", "deml-components.css"),
    os.path.join(root_dir, "frontend", "public", "assets", "deml-components.css"),
    os.path.join(root_dir, "backend", "static", "deml-components.css"),
    os.path.join(root_dir, "marketing", "public", "assets", "deml-components.css"),
  ]

  viking_css_targets = [
    os.path.join(root_dir, "frontend", "src", "assets", "viking-ui.css"),
    os.path.join(root_dir, "frontend", "public", "assets", "viking-ui.css"),
    os.path.join(root_dir, "backend", "static", "viking-ui.css"),
    os.path.join(root_dir, "marketing", "public", "assets", "viking-ui.css"),
    os.path.join(root_dir, "viking-ui-docs", "public", "assets", "viking-ui.css"),
    os.path.join(docs_static_dir, "viking-ui.css"),
  ]

  elements_targets = [
    os.path.join(root_dir, "frontend", "src", "assets", "viking-ui-elements.js"),
    os.path.join(root_dir, "frontend", "public", "assets", "viking-ui-elements.js"),
    os.path.join(root_dir, "backend", "static", "viking-ui-elements.js"),
    os.path.join(root_dir, "marketing", "public", "assets", "viking-ui-elements.js"),
    os.path.join(root_dir, "viking-ui-docs", "public", "assets", "viking-ui-elements.js"),
    os.path.join(docs_static_dir, "viking-ui-elements.js"),
  ]

  docs_token_targets = [
    os.path.join(docs_static_dir, "design-tokens.css"),
    os.path.join(root_dir, "viking-ui-docs", "public", "assets", "design-tokens.css"),
  ]
  docs_viking_components_targets = [
    os.path.join(docs_static_dir, "viking-components.css"),
    os.path.join(root_dir, "viking-ui-docs", "public", "assets", "viking-components.css"),
  ]
  docs_component_targets = [
    os.path.join(docs_static_dir, "deml-components.css"),
    os.path.join(root_dir, "viking-ui-docs", "public", "assets", "deml-components.css"),
  ]
  tokens_json_targets = [
    os.path.join(docs_static_dir, "viking-tokens.json"),
    os.path.join(root_dir, "viking-ui-docs", "public", "assets", "viking-tokens.json"),
  ]

  for src, targets in (
    (dist_tokens, token_targets + docs_token_targets),
    (dist_viking_components, viking_components_targets + docs_viking_components_targets),
    (dist_components, component_targets + docs_component_targets),
    (dist_viking, viking_css_targets),
    (dist_elements, elements_targets),
    (dist_tokens_json, tokens_json_targets),
  ):
    for target in targets:
      os.makedirs(os.path.dirname(target), exist_ok=True)
      shutil.copy2(src, target)

  print("Syncing self-hosted Inter fonts...")
  subprocess.run(
    [sys.executable, os.path.join(root_dir, "scripts", "sync_fonts.py")],
    check=True,
  )

  print("Successfully synced design system to:")
  for target in (
    token_targets
    + viking_components_targets
    + component_targets
    + viking_css_targets
    + elements_targets
  ):
    print(f" - {target}")

  print("Building site-drakkar assets and Django partials...")
  subprocess.run(["npm", "run", "build:site-drakkar"], cwd=frontend_dir, check=True)

  print("Syncing widget assets...")
  subprocess.run(
    [sys.executable, os.path.join(root_dir, "scripts", "sync_widgets.py")],
    check=True,
  )


if __name__ == "__main__":
  sync_design_system()

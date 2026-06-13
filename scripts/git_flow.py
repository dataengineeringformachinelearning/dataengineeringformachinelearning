#!/usr/bin/env python3
import argparse
import os
import subprocess
import sys
from typing import Final

VERSION_FILE: Final[str] = os.path.join(
  os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "version.txt"
)


def run_cmd(cmd: str, check: bool = True) -> str | None:
  try:
    res = subprocess.run(cmd, shell=True, check=check, text=True, capture_output=True)
    return res.stdout.strip()
  except subprocess.CalledProcessError as e:
    print(f"Error executing command: {cmd}", file=sys.stderr)
    print(e.stderr, file=sys.stderr)
    if check:
      sys.exit(e.returncode)
    return None


def get_current_version() -> str:
  if not os.path.exists(VERSION_FILE):
    return "0.0.0"
  with open(VERSION_FILE) as f:
    return f.read().strip()


def write_version(ver: str) -> None:
  with open(VERSION_FILE, "w") as f:
    f.write(f"{ver}\n")
  # Also write to local paths inside frontend and backend for deployment environments
  root_dir = os.path.dirname(VERSION_FILE)
  for p in [
    os.path.join(root_dir, "frontend", "version.txt"),
    os.path.join(root_dir, "backend", "version.txt"),
  ]:
    with open(p, "w") as f:
      f.write(f"{ver}\n")


def bump_version(ver: str, part: str) -> str:
  major, minor, patch = map(int, ver.split("."))
  if part == "major":
    return f"{major + 1}.0.0"
  elif part == "minor":
    return f"{major}.{minor + 1}.0"
  elif part == "patch":
    return f"{major}.{minor}.{patch + 1}"
  return ver


def handle_feature(args: argparse.Namespace) -> None:
  branch_name: Final[str] = f"feature/{args.name.lower().replace(' ', '-')}"
  print(f"Creating and switching to feature branch: {branch_name}")
  run_cmd(f"git checkout -b {branch_name}")


def handle_pr(args: argparse.Namespace) -> None:
  # Verify we are not on main
  curr_branch: Final[str | None] = run_cmd("git branch --show-current")
  if curr_branch == "main":
    print(
      "Error: You are on 'main' branch. Features should be developed in a feature branch.",
      file=sys.stderr,
    )
    sys.exit(1)

  print(f"Pushing current branch '{curr_branch}' to origin...")
  run_cmd(f"git push -u origin {curr_branch}")

  # Generate GitHub PR URL
  repo_url: Final[str | None] = run_cmd("git config --get remote.origin.url")
  if repo_url and "github.com" in repo_url:
    clean_url: Final[str] = (
      repo_url.replace(".git", "")
      .replace("git@github.com:", "https://github.com/")
      .replace("git://", "https://")
    )
    pr_url: Final[str] = f"{clean_url}/compare/main...{curr_branch}?expand=1"
    print("\n" + "=" * 60)
    print("Pull Request prepared successfully!")
    print(f"You can open and merge your PR here:\n{pr_url}")
    print("=" * 60 + "\n")
  else:
    print("Branch pushed. Please open a Pull Request on your remote Git hosting service.")


def handle_release(args: argparse.Namespace) -> None:
  curr_ver: Final[str] = get_current_version()
  new_ver: Final[str] = bump_version(curr_ver, args.part)
  print(f"Bumping version from {curr_ver} to {new_ver} ({args.part})...")

  # Ensure working tree is clean except for possibly files we modify
  status: Final[str | None] = run_cmd("git status --porcelain")
  if status:
    # Check if version.txt is the only modified file
    lines: Final[list[str]] = status.split("\n")
    non_ver_changes: Final[list[str]] = [
      line for line in lines if line and not line.endswith("version.txt")
    ]
    if non_ver_changes:
      print(
        "Warning: There are uncommitted changes in the repository. Please commit or stash them first.",
        file=sys.stderr,
      )
      sys.exit(1)

  write_version(new_ver)

  # Trigger set-env.js in frontend to bake version in
  frontend_dir: Final[str] = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend"
  )
  if os.path.exists(os.path.join(frontend_dir, "set-env.js")):
    print("Generating environment files with new version...")
    run_cmd(f"node {os.path.join(frontend_dir, 'set-env.js')}")

  # Commit version bump
  run_cmd("git add version.txt frontend/version.txt backend/version.txt")
  run_cmd(f'git commit -m "chore(release): bump version to {new_ver}"')

  # Create tag
  tag_name: Final[str] = f"v{new_ver}"
  print(f"Creating Git release tag: {tag_name}")
  run_cmd(f'git tag -a {tag_name} -m "Release {tag_name}"')

  print("\n" + "=" * 60)
  print(f"Release version {new_ver} committed and tagged locally.")
  print("To publish the release, run:")
  print("  git push origin main --tags")
  print("=" * 60 + "\n")


def handle_tag_history(args: argparse.Namespace) -> None:
  # Predefined milestones based on commit messages/hashes
  milestones: Final[list[dict[str, str]]] = [
    {"commit": "d67297e", "tag": "v0.1.0", "msg": "Milestone: CMS (Sanity) integration"},
    {"commit": "9192d92", "tag": "v0.1.1", "msg": "Milestone: Threat Predictor model"},
    {"commit": "d7787f6", "tag": "v0.2.0", "msg": "Milestone: New SaaS landing page design"},
    {"commit": "ea52b00", "tag": "v0.3.0", "msg": "Milestone: Newsletter subscription flow"},
    {
      "commit": "c192c1c",
      "tag": "v0.4.0",
      "msg": "Milestone: Security compliance, STIX, and reporting integration",
    },
    {
      "commit": "02e23b1",
      "tag": "v0.4.1",
      "msg": "Milestone: E2E Encryption and telemetry safeguards",
    },
    {
      "commit": "44da37e",
      "tag": "v0.5.0",
      "msg": "Milestone: Performance optimization and current release",
    },
  ]

  print("Verifying commits and applying historical tags...")
  for ms in milestones:
    # Check if commit exists
    commit_check: Final[str | None] = run_cmd(f"git cat-file -t {ms['commit']}", check=False)
    if commit_check == "commit":
      # Check if tag already exists
      tag_exists: Final[str | None] = run_cmd(f"git tag -l {ms['tag']}", check=False)
      if tag_exists == ms["tag"]:
        print(f"Tag {ms['tag']} already exists. Skipping.")
      else:
        print(f"Tagging {ms['commit']} as {ms['tag']} - {ms['msg']}")
        run_cmd(f"git tag -a {ms['tag']} {ms['commit']} -m \"{ms['msg']}\"")
    else:
      print(f"Warning: Commit {ms['commit']} not found. Skipping tag {ms['tag']}.")

  print("\nHistorical tagging complete. Run 'git push origin --tags' to upload them to GitHub.")


def main() -> None:
  parser = argparse.ArgumentParser(description="Git Flow & Release Automation CLI")
  subparsers = parser.add_subparsers(dest="command", required=True)

  # Feature command
  parser_feat = subparsers.add_parser("feature", help="Create a new feature branch")
  parser_feat.add_argument("name", help="Name of the feature")

  # PR command
  subparsers.add_parser("pr", help="Push current branch and generate a GitHub PR URL")

  # Release command
  parser_rel = subparsers.add_parser(
    "release", help="Bump version, generate environment files, and tag a release"
  )
  parser_rel.add_argument("part", choices=["major", "minor", "patch"], help="Version part to bump")

  # Tag history command
  subparsers.add_parser("tag-history", help="Recreate historical git tags based on milestones")

  args = parser.parse_args()

  if args.command == "feature":
    handle_feature(args)
  elif args.command == "pr":
    handle_pr(args)
  elif args.command == "release":
    handle_release(args)
  elif args.command == "tag-history":
    handle_tag_history(args)


if __name__ == "__main__":
  main()

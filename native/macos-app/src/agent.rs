use std::{
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
    process::{Command, Stdio},
};

use anyhow::{Context, Result, bail};

use crate::models::{AgentProposal, Finding};

const CONTEXT_LIMIT: usize = 64 * 1024;

pub fn build_prompt(
    finding: &Finding,
    operator_request: &str,
    workspace: &str,
    context_paths: &str,
) -> Result<String> {
    let context = collect_context(workspace, context_paths)?;
    Ok(format!(
        r#"Analyze this authorized defensive security finding and propose a minimal remediation.

FINDING
Title: {}
Severity: {}
Status: {}
CVE: {}
Asset: {}
Description: {}

OPERATOR REQUEST
{}

AUTHORIZED REPOSITORY CONTEXT
{}

Return one JSON object with this exact shape:
{{
  "summary": "short diagnosis and proposed outcome",
  "risk": "remaining risk and validation notes",
  "steps": ["ordered remediation step"],
  "commands": ["optional commands for the operator to review; they will not be executed"],
  "patch": "optional complete unified git diff using only repository-relative paths, or null"
}}
Do not wrap the JSON in Markdown. Keep changes tightly scoped to the finding."#,
        finding.title,
        finding.severity.label(),
        finding.status.label(),
        empty_as_none(&finding.cve),
        finding.asset,
        finding.description,
        operator_request,
        if context.is_empty() {
            "No files supplied."
        } else {
            &context
        },
    ))
}

fn empty_as_none(value: &str) -> &str {
    if value.trim().is_empty() {
        "None supplied"
    } else {
        value
    }
}

pub fn parse_proposal(raw: &str) -> Result<AgentProposal> {
    let trimmed = raw.trim();
    if let Ok(value) = serde_json::from_str(trimmed) {
        return Ok(value);
    }
    let start = trimmed
        .find('{')
        .context("model response contained no JSON object")?;
    let end = trimmed
        .rfind('}')
        .context("model response contained no complete JSON object")?;
    serde_json::from_str(&trimmed[start..=end])
        .context("model response did not match the proposal schema")
}

fn collect_context(workspace: &str, paths: &str) -> Result<String> {
    if paths.trim().is_empty() {
        return Ok(String::new());
    }
    let root =
        fs::canonicalize(workspace).context("select a valid workspace before adding context")?;
    let mut result = String::new();
    for raw_path in paths
        .split([',', '\n'])
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let requested = Path::new(raw_path);
        if requested.is_absolute() {
            bail!("context paths must be relative: {raw_path}");
        }
        let canonical = fs::canonicalize(root.join(requested))
            .with_context(|| format!("context file not found: {raw_path}"))?;
        if !canonical.starts_with(&root) || !canonical.is_file() {
            bail!("context path escapes the workspace: {raw_path}");
        }
        // nosemgrep: rust.actix.path-traversal.tainted-path.tainted-path
        let bytes = fs::read(&canonical)?;
        if result.len() + bytes.len() > CONTEXT_LIMIT {
            bail!("context exceeds the 64 KiB safety limit");
        }
        let text = String::from_utf8(bytes)
            .with_context(|| format!("context file is not UTF-8 text: {raw_path}"))?;
        result.push_str(&format!("\n--- FILE: {raw_path} ---\n{text}\n"));
    }
    Ok(result)
}

pub fn apply_patch(workspace: &str, patch: &str) -> Result<()> {
    if patch.trim().is_empty() {
        bail!("proposal has no patch");
    }
    validate_patch_paths(patch)?;
    let root = fs::canonicalize(workspace).context("workspace does not exist")?;
    if !root.is_dir() {
        bail!("workspace is not a directory");
    }
    run_git_apply(&root, patch, true)?;
    run_git_apply(&root, patch, false)
}

fn run_git_apply(root: &Path, patch: &str, check: bool) -> Result<()> {
    let mut command = Command::new("git");
    command.arg("-C").arg(root).arg("apply");
    if check {
        command.arg("--check");
    }
    let mut child = command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("failed to start git apply")?;
    child
        .stdin
        .take()
        .context("git stdin unavailable")?
        .write_all(patch.as_bytes())?;
    let output = child.wait_with_output()?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr);
        bail!(
            "git apply{} failed: {}",
            if check { " --check" } else { "" },
            message.trim()
        );
    }
    Ok(())
}

fn validate_patch_paths(patch: &str) -> Result<()> {
    let mut saw_path = false;
    for line in patch.lines() {
        let raw = if let Some(value) = line
            .strip_prefix("--- ")
            .or_else(|| line.strip_prefix("+++ "))
        {
            Some(value.split('\t').next().unwrap_or(value))
        } else if let Some(value) = line.strip_prefix("diff --git ") {
            for part in value.split_whitespace() {
                validate_diff_path(part)?;
                saw_path = true;
            }
            None
        } else {
            None
        };
        if let Some(path) = raw
            && path != "/dev/null"
        {
            validate_diff_path(path)?;
            saw_path = true;
        }
    }
    if !saw_path {
        bail!("patch contains no recognizable file paths");
    }
    Ok(())
}

fn validate_diff_path(raw: &str) -> Result<()> {
    let without_prefix = raw
        .strip_prefix("a/")
        .or_else(|| raw.strip_prefix("b/"))
        .unwrap_or(raw);
    let path = PathBuf::from(without_prefix);
    if path.is_absolute() || path.as_os_str().is_empty() {
        bail!("patch contains an invalid path: {raw}");
    }
    if path
        .components()
        .any(|part| !matches!(part, Component::Normal(_)))
    {
        bail!("patch path traversal rejected: {raw}");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_json_inside_fences() {
        let result = parse_proposal("```json\n{\"summary\":\"ok\",\"risk\":\"low\",\"steps\":[],\"commands\":[],\"patch\":null}\n```").unwrap();
        assert_eq!(result.summary, "ok");
    }

    #[test]
    fn rejects_patch_traversal() {
        let patch =
            "diff --git a/../../secret b/../../secret\n--- a/../../secret\n+++ b/../../secret\n";
        assert!(validate_patch_paths(patch).is_err());
    }

    #[test]
    fn context_cannot_escape_workspace() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::NamedTempFile::new().unwrap();
        let link = root.path().join("link");
        std::os::unix::fs::symlink(outside.path(), &link).unwrap();
        assert!(collect_context(root.path().to_str().unwrap(), "link").is_err());
    }
}

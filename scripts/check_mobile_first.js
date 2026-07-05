#!/usr/bin/env node
/**
 * Root wrapper — delegates to frontend mobile-first enforcement.
 * AGENTS.md and pre-commit reference `node scripts/check_mobile_first.js`.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const scriptPath = path.join(
  __dirname,
  "../frontend/scripts/check_mobile_first.js",
);
const result = spawnSync(process.execPath, [scriptPath], { stdio: "inherit" });
process.exit(result.status ?? 1);

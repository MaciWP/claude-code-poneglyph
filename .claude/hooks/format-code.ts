#!/usr/bin/env bun

/**
 * Format Code - PostToolUse Hook
 *
 * Language-aware code formatter. Detects file type and runs the appropriate
 * formatter. Missing tools are silently skipped (best-effort).
 */

import { $ } from "bun";
import { getLanguageFamily } from "./validators/config";

const input = JSON.parse(await Bun.stdin.text());
const filePath = input.tool_input?.file_path ?? "";
const family = getLanguageFamily(filePath);

switch (family) {
  case "typescript":
  case "javascript":
    try {
      await $`bunx eslint --fix --quiet ${filePath}`.quiet().nothrow();
    } catch {}
    try {
      await $`bunx prettier --write --log-level silent ${filePath}`
        .quiet()
        .nothrow();
    } catch {}
    break;
  case "python":
    try {
      await $`ruff format ${filePath}`.quiet().nothrow();
    } catch {}
    try {
      await $`ruff check --fix --quiet ${filePath}`.quiet().nothrow();
    } catch {}
    break;
  case "go":
    try {
      await $`gofmt -w ${filePath}`.quiet().nothrow();
    } catch {}
    break;
  case "rust":
    try {
      await $`rustfmt ${filePath}`.quiet().nothrow();
    } catch {}
    break;
}

process.exit(0);

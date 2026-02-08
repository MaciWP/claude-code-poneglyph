#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { $ } from "bun";

const input = JSON.parse(await Bun.stdin.text());
const filePath: string = input.tool_input?.file_path ?? "";
const ext = filePath.split(".").pop()?.toLowerCase();

const TS_EXTENSIONS = ["ts", "tsx"];

if (!ext || !TS_EXTENSIONS.includes(ext)) {
  process.exit(0);
}

const tmpDir = process.env.TEMP ?? process.env.TMPDIR ?? "/tmp";
const lockFile = join(tmpDir, "typecheck-guard.lock");
const DEBOUNCE_MS = 15_000;

if (existsSync(lockFile)) {
  try {
    const lastRun = parseInt(readFileSync(lockFile, "utf-8"), 10);
    if (Date.now() - lastRun < DEBOUNCE_MS) {
      process.exit(0);
    }
  } catch {
    /* stale lock, continue */
  }
}

writeFileSync(lockFile, String(Date.now()));

try {
  const result = await $`tsc --noEmit`.quiet().nothrow();
  if (result.exitCode !== 0) {
    const output =
      result.stderr.toString().trim() || result.stdout.toString().trim();
    const lines = output.split("\n");
    const limited = lines.slice(0, 20).join("\n");
    const suffix =
      lines.length > 20 ? `\n... (${lines.length - 20} more errors)` : "";
    console.error(`[typecheck-guard] Type errors found:\n${limited}${suffix}`);
  }
} catch {
  /* tsc not available, skip */
}

process.exit(0);

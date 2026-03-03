#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { $ } from "bun";

const EXIT_PASS = 0;
const EXIT_BLOCK = 2;

const input = JSON.parse(await Bun.stdin.text());
const filePath: string = input.tool_input?.file_path ?? "";
const ext = filePath.split(".").pop()?.toLowerCase();

const TS_EXTENSIONS = ["ts", "tsx"];

if (!ext || !TS_EXTENSIONS.includes(ext)) {
  process.exit(EXIT_PASS);
}

const tmpDir = process.env.TEMP ?? process.env.TMPDIR ?? "/tmp";
const lockFile = join(tmpDir, "typecheck-guard.lock");
const DEBOUNCE_MS = 15_000;

if (existsSync(lockFile)) {
  try {
    const lastRun = parseInt(readFileSync(lockFile, "utf-8"), 10);
    if (Date.now() - lastRun < DEBOUNCE_MS) {
      process.exit(EXIT_PASS);
    }
  } catch {
    /* stale lock, continue */
  }
}

writeFileSync(lockFile, String(Date.now()));

function findTsconfig(startPath: string): string | null {
  let dir = dirname(resolve(startPath));
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, "tsconfig.json");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

try {
  const tsconfig = findTsconfig(filePath);

  if (!tsconfig) {
    process.exit(EXIT_PASS);
  }

  const projectDir = dirname(tsconfig);
  const result = await $`tsc --noEmit --project ${tsconfig}`
    .cwd(projectDir)
    .quiet()
    .nothrow();

  if (result.exitCode !== 0) {
    const output =
      result.stderr.toString().trim() || result.stdout.toString().trim();
    if (output.includes("error TS")) {
      const lines = output.split("\n");
      const limited = lines.slice(0, 20).join("\n");
      const suffix =
        lines.length > 20 ? `\n... (${lines.length - 20} more errors)` : "";
      console.error(
        `[typecheck-guard] Type errors found:\n${limited}${suffix}`,
      );
      process.exit(EXIT_BLOCK);
    }
  }
} catch {
  /* tsc not available, skip */
}

process.exit(EXIT_PASS);

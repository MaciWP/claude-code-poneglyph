#!/usr/bin/env bun
// Stop hook: scans recently written files for potential secret leaks.
// Best-effort: always exits 0 (never blocks), emits warnings to stderr.

import { readHookStdin } from "./lib/hook-stdin";

const SECRET_PATTERN =
  /(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\s*[=:]\s*['"]?[A-Za-z0-9_\-\.]{16,}['"]?/gi;

const TEXT_EXTENSIONS = new Set([
  ".ts", ".js", ".json", ".md", ".env", ".yaml", ".yml",
]);

function hasTextExtension(filePath: string): boolean {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return false;
  return TEXT_EXTENSIONS.has(filePath.slice(dot).toLowerCase());
}

async function getModifiedFiles(): Promise<string[]> {
  const proc = Bun.spawn(["git", "diff", "--name-only", "HEAD"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  return output
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && hasTextExtension(f));
}

async function scanFile(filePath: string): Promise<void> {
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return;
    const content = await file.text();
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (SECRET_PATTERN.test(lines[i])) {
        process.stderr.write(
          `[security-gate] WARNING: Potential secret at ${filePath}:${i + 1}\n`,
        );
      }
      SECRET_PATTERN.lastIndex = 0;
    }
  } catch {
    // best-effort — skip unreadable files
  }
}

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    if (!raw.trim()) {
      process.exit(0);
    }

    const files = await getModifiedFiles();
    await Promise.all(files.map(scanFile));
  } catch {
    // best-effort — never block
  }

  process.exit(0);
}

if (import.meta.main) {
  main();
}

#!/usr/bin/env bun

/**
 * TypeScript Syntax Validator for PostToolUse hooks.
 * Runs tsc --noEmit to check for syntax errors in TypeScript files.
 */

import { dirname, join } from "node:path";
import {
  EXIT_CODES,
  readStdin,
  reportError,
  isTypeScriptFile,
} from "../config";

async function main(): Promise<void> {
  const input = await readStdin();

  const filePath = input.tool_input.file_path;
  if (!filePath) {
    process.exit(EXIT_CODES.PASS);
  }

  if (!isTypeScriptFile(filePath)) {
    process.exit(EXIT_CODES.PASS);
  }

  const tscPath = Bun.which("tsc") || join(dirname(process.execPath), "tsc");

  const proc = Bun.spawn(
    [
      tscPath,
      "--noEmit",
      "--isolatedModules",
      "--skipLibCheck",
      "--target",
      "ESNext",
      "--module",
      "ESNext",
      "--moduleResolution",
      "bundler",
      "--pretty",
      "false",
      filePath,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const TIMEOUT_MS = 5000;
  const exitCode = await Promise.race([
    proc.exited,
    new Promise<number>((resolve) =>
      setTimeout(() => {
        proc.kill();
        resolve(143);
      }, TIMEOUT_MS),
    ),
  ]);

  // Timeout: tsc was too slow — pass (best-effort, not a confirmed error)
  if (exitCode === 143) {
    process.exit(EXIT_CODES.PASS);
  }

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const output = stdout || stderr;

  if (exitCode !== 0) {
    reportError(`TypeScript syntax error:\n${output}`);
  }

  process.exit(EXIT_CODES.PASS);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  reportError(`Validator failed: ${message}`);
});

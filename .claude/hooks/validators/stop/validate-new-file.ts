#!/usr/bin/env bun

/**
 * Stop Hook Validator: Verify a new file exists.
 *
 * Reads stdin JSON (consumes to avoid broken pipe) but does not use it.
 * Uses VALIDATE_FILE_PATH env var to determine which file to check.
 * If env var is not set, skips validation (exit 0).
 */

import { existsSync } from "fs";
import { EXIT_CODES } from "../config";

// =============================================================================
// Stdin Consumption
// =============================================================================

async function consumeStdin(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", () => {});
    process.stdin.on("end", resolve);
    process.stdin.on("error", resolve);
    process.stdin.resume();
  });
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  await consumeStdin();

  const filePath = process.env.VALIDATE_FILE_PATH;

  if (!filePath) {
    process.exit(EXIT_CODES.PASS);
  }

  if (existsSync(filePath)) {
    process.exit(EXIT_CODES.PASS);
  }

  console.error(`VALIDATION FAILED: Expected file does not exist: ${filePath}`);
  process.exit(EXIT_CODES.BLOCK);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`validate-new-file failed: ${message}`);
  process.exit(EXIT_CODES.BLOCK);
});

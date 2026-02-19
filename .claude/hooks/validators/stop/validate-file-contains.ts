#!/usr/bin/env bun

/**
 * Stop Hook Validator: Verify file contains expected strings or patterns.
 *
 * Reads stdin JSON (consumes to avoid broken pipe) but does not use it.
 * Env vars:
 *   VALIDATE_FILE_PATH - file to check (required if using this validator)
 *   VALIDATE_CONTAINS  - comma-separated literal strings that MUST exist
 *   VALIDATE_PATTERNS  - comma-separated regex patterns that MUST match
 *
 * If neither VALIDATE_CONTAINS nor VALIDATE_PATTERNS is set, skips (exit 0).
 */

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
// Validation Logic
// =============================================================================

function checkLiteralStrings(content: string, containsValue: string): string[] {
  const missing: string[] = [];
  const strings = containsValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const str of strings) {
    if (!content.includes(str)) {
      missing.push(str);
    }
  }

  return missing;
}

function checkPatterns(content: string, patternsValue: string): string[] {
  const failing: string[] = [];
  const patterns = patternsValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern);
      if (!regex.test(content)) {
        failing.push(pattern);
      }
    } catch {
      failing.push(`${pattern} (invalid regex)`);
    }
  }

  return failing;
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  await consumeStdin();

  const containsValue = process.env.VALIDATE_CONTAINS;
  const patternsValue = process.env.VALIDATE_PATTERNS;

  if (!containsValue && !patternsValue) {
    process.exit(EXIT_CODES.PASS);
  }

  const filePath = process.env.VALIDATE_FILE_PATH;

  if (!filePath) {
    console.error(
      "VALIDATION FAILED: VALIDATE_FILE_PATH is required when VALIDATE_CONTAINS or VALIDATE_PATTERNS is set",
    );
    process.exit(EXIT_CODES.BLOCK);
  }

  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    console.error(`VALIDATION FAILED: File does not exist: ${filePath}`);
    process.exit(EXIT_CODES.BLOCK);
  }

  const content = await file.text();
  const errors: string[] = [];

  if (containsValue) {
    const missingStrings = checkLiteralStrings(content, containsValue);
    for (const str of missingStrings) {
      errors.push(`Missing literal string: "${str}"`);
    }
  }

  if (patternsValue) {
    const failingPatterns = checkPatterns(content, patternsValue);
    for (const pattern of failingPatterns) {
      errors.push(`Pattern not matched: /${pattern}/`);
    }
  }

  if (errors.length > 0) {
    const lines = [
      `VALIDATION FAILED: File ${filePath} missing expected content:`,
      "",
      ...errors.map((e) => `  - ${e}`),
    ];
    console.error(lines.join("\n"));
    process.exit(EXIT_CODES.BLOCK);
  }

  process.exit(EXIT_CODES.PASS);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`validate-file-contains failed: ${message}`);
  process.exit(EXIT_CODES.BLOCK);
});

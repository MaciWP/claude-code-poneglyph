#!/usr/bin/env bun

/**
 * TypeScript Syntax Validator for PostToolUse hooks.
 *
 * Uses Bun.Transpiler for instant syntax validation (~microseconds)
 * instead of spawning tsc (~seconds). Only catches syntax errors,
 * not type errors (typecheck-guard.ts handles those separately).
 */

import {
  EXIT_CODES,
  readStdin,
  reportError,
  isTypeScriptFile,
} from "../config";

function getLoader(filePath: string): "ts" | "tsx" {
  return filePath.toLowerCase().endsWith(".tsx") ? "tsx" : "ts";
}

async function main(): Promise<void> {
  const input = await readStdin();

  const filePath = input.tool_input.file_path;
  if (!filePath) {
    process.exit(EXIT_CODES.PASS);
  }

  if (!isTypeScriptFile(filePath)) {
    process.exit(EXIT_CODES.PASS);
  }

  // Get content from tool_input or read from file
  let content = input.tool_input.content;
  if (!content) {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      content = await file.text();
    } else {
      process.exit(EXIT_CODES.PASS);
    }
  }

  try {
    const transpiler = new Bun.Transpiler({ loader: getLoader(filePath) });
    transpiler.transformSync(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    reportError(`TypeScript syntax error:\n${filePath}\n${message}`);
  }

  process.exit(EXIT_CODES.PASS);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  reportError(`Validator failed: ${message}`);
});

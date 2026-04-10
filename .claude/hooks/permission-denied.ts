#!/usr/bin/env bun

/**
 * PermissionDenied hook (Claude Code 2.1.89+): records tool permission denials
 * to ~/.claude/error-patterns.jsonl via recordError so error-analyzer can
 * learn from repeated blocks.
 *
 * Best-effort - never blocks Claude Code (always exits 0).
 */

import { recordError } from "./lib/error-patterns";
import {
  normalizeDeniedCall,
  extractCommandPreview,
  extractReason,
  buildDenialMessage,
} from "./lib/permission-denial-utils";
import { readHookStdin } from "./lib/hook-stdin";

const TAG = "[permission-denied]";

function log(message: string): void {
  process.stderr.write(`${TAG} ${message}\n`);
}

function parseToolInput(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return undefined;
}

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    if (!raw.trim()) {
      process.exit(0);
    }

    const input: Record<string, unknown> = JSON.parse(raw);
    const toolName =
      typeof input.tool_name === "string" ? input.tool_name : "unknown";
    const toolInput = parseToolInput(input.tool_input);

    const normalized = normalizeDeniedCall(toolName, toolInput);
    const preview = extractCommandPreview(toolName, toolInput);
    const reason = extractReason(input);
    const message = buildDenialMessage(toolName, normalized, preview, reason);

    recordError(message);
    log(`Recorded denial: ${toolName}:${normalized}`);
  } catch {
    // Never block - recording is best-effort
  }

  process.exit(0);
}

if (import.meta.main) {
  main();
}

#!/usr/bin/env bun
// Unified error recorder: handles both PermissionDenied and StopFailure events.
// Replaces permission-denied.ts and api-error-recorder.ts.

import { recordError } from "./lib/error-patterns";
import {
  normalizeDeniedCall,
  extractCommandPreview,
  extractReason,
  buildDenialMessage,
} from "./lib/permission-denial-utils";
import { readHookStdin } from "./lib/hook-stdin";

const TAG = "[error-recorder]";

function log(msg: string): void {
  process.stderr.write(`${TAG} ${msg}\n`);
}

export function parseToolInput(
  value: unknown,
): Record<string, unknown> | undefined {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function extractErrorMessage(input: Record<string, unknown>): string {
  const error = input.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const msg = (error as Record<string, unknown>).message;
    if (typeof msg === "string") return msg;
    return JSON.stringify(error);
  }
  return "unknown API error";
}

export function handlePermissionDenied(input: Record<string, unknown>): void {
  const toolName =
    typeof input.tool_name === "string" ? input.tool_name : "unknown";
  const toolInput = parseToolInput(input.tool_input);
  const normalized = normalizeDeniedCall(toolName, toolInput);
  const preview = extractCommandPreview(toolName, toolInput);
  const reason = extractReason(input);
  const message = buildDenialMessage(toolName, normalized, preview, reason);
  recordError(message);
  log(`Recorded denial: ${toolName}:${normalized}`);
}

export function handleStopFailure(input: Record<string, unknown>): void {
  const errorMessage = extractErrorMessage(input);
  recordError(errorMessage);
  log(`Recorded error pattern: ${errorMessage.slice(0, 80)}`);
}

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    if (!raw.trim()) process.exit(0);

    const input: Record<string, unknown> = JSON.parse(raw);

    if ("tool_name" in input) {
      handlePermissionDenied(input);
    } else if ("error" in input) {
      handleStopFailure(input);
    } else {
      log("Unknown event type — skipping");
    }
  } catch {
    // Never block - recording is best-effort
  }

  process.exit(0);
}

if (import.meta.main) {
  main().catch(() => process.exit(0));
}

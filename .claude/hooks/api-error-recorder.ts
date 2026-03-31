#!/usr/bin/env bun

/**
 * StopFailure hook: records API error patterns to ~/.claude/error-patterns.jsonl
 * Best-effort - never blocks Claude Code (always exits 0).
 *
 * StopFailure hooks receive JSON via stdin with:
 *   - session_id: string
 *   - error: string | { message: string } (the API error details)
 *   - transcript_path: string
 */

import { recordError } from "./lib/error-patterns";

const TAG = "[api-error-recorder]";

function log(message: string): void {
  process.stderr.write(`${TAG} ${message}\n`);
}

async function consumeStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      chunks.push(chunk);
    });
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", () => resolve(""));
    process.stdin.resume();
  });
}

function extractErrorMessage(input: Record<string, unknown>): string {
  const error = input.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const msg = (error as Record<string, unknown>).message;
    if (typeof msg === "string") return msg;
    return JSON.stringify(error);
  }
  return "unknown API error";
}

async function main(): Promise<void> {
  try {
    const raw = await consumeStdin();
    if (!raw.trim()) {
      process.exit(0);
    }

    const input: Record<string, unknown> = JSON.parse(raw);
    const errorMessage = extractErrorMessage(input);

    recordError(errorMessage);
    log(`Recorded error pattern: ${errorMessage.slice(0, 80)}`);
  } catch {
    // Never block - error recording is best-effort
  }

  process.exit(0);
}

main();

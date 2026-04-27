#!/usr/bin/env bun

/**
 * PostToolUse/PostToolUseFailure hook: records tool execution timings per session.
 * Uses duration_ms available in Claude Code v2.1.119+ hook inputs.
 *
 * Data accumulates in ~/.claude/tool-timings/{sessionId}.jsonl and is
 * consumed by trace-logger.ts at Stop time to enrich TraceEntry.toolTimings.
 *
 * Best-effort — never blocks Claude Code (always exits 0).
 */

import { readHookStdin } from "./lib/hook-stdin";
import { appendToolTiming } from "./lib/tool-timing";

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    if (!raw.trim()) return;

    const input = JSON.parse(raw);

    const durationMs: unknown = input.duration_ms;
    if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) return;

    const toolName = typeof input.tool_name === "string" ? input.tool_name : "unknown";
    const sessionId =
      typeof input.session_id === "string" && input.session_id
        ? input.session_id
        : String(process.ppid);
    const failed = input.hook_event_name === "PostToolUseFailure";

    appendToolTiming(sessionId, toolName, durationMs, failed);
  } catch {
    // best-effort — never block
  }
}

if (import.meta.main) {
  main().finally(() => process.exit(0));
}

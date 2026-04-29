#!/usr/bin/env bun

/**
 * SubagentStart hook (Claude Code 2.0.43+): captures spawn context
 * (injected skills, expertise bytes, effort) for each spawned subagent
 * so mineSpawnSuccessPatterns can correlate combos -> success rate.
 *
 * Best-effort - never blocks Claude Code (always exits 0).
 *
 * SubagentStart hooks receive JSON via stdin with (defensively parsed):
 *   - session_id: string
 *   - agent_type: string
 *   - prompt: string
 *   - agent_id: string (optional)
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseSpawnContext } from "./lib/subagent-start-parser";
import { readHookStdin } from "./lib/hook-stdin";

const TAG = "[subagent-start]";
const SPAWNS_PATH = join(homedir(), ".claude", "agent-spawns.jsonl");

function log(message: string): void {
  process.stderr.write(`${TAG} ${message}\n`);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function appendSpawnRecord(record: Record<string, unknown>): void {
  mkdirSync(join(homedir(), ".claude"), { recursive: true });
  appendFileSync(SPAWNS_PATH, JSON.stringify(record) + "\n");
}

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    if (!raw.trim()) {
      process.exit(0);
    }

    const input: Record<string, unknown> = JSON.parse(raw);
    const prompt = asString(input.prompt, "");
    const agentType = asString(input.agent_type, "unknown");
    const sessionId = asString(input.session_id, "unknown");

    const ctx = parseSpawnContext(prompt);

    const record = {
      ts: new Date().toISOString(),
      sessionId,
      agentType,
      promptHash: ctx.promptHash,
      memoryBytes: ctx.memoryBytes,
      skillsInjected: ctx.skillsInjected,
      effort: ctx.effort,
    };

    appendSpawnRecord(record);
    log(
      `Spawned ${agentType}: memory=${ctx.memoryBytes}B skills=${ctx.skillsInjected.length} effort=${ctx.effort ?? "null"}`,
    );
  } catch {
    // Never block - recording is best-effort
  }

  process.exit(0);
}

if (import.meta.main) {
  main();
}

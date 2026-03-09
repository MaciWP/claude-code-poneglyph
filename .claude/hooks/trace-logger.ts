#!/usr/bin/env bun

/**
 * Stop hook: logs execution trace to ~/.claude/traces/YYYY-MM-DD.jsonl
 * Best-effort logging - never blocks Claude Code (always exits 0).
 *
 * Stop hooks receive JSON via stdin with:
 *   - session_id: string
 *   - last_assistant_message: string
 *   - transcript: Array<{role, content}>  (when available)
 */

import { mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import type { TranscriptMessage } from "./lib/trace-extract";
import {
  extractFirstUserPrompt,
  extractAgentsAndSkills,
} from "./lib/trace-extract";
import {
  estimateTokens,
  detectModel,
  calculateCost,
  calculateDuration,
  detectStatus,
  countToolCalls,
  countFilesChanged,
} from "./lib/trace-metrics";

export type { ContentBlock, TranscriptMessage } from "./lib/trace-extract";

export {
  getContentLength,
  extractFirstUserPrompt,
  extractAgentsAndSkills,
} from "./lib/trace-extract";

export {
  MODEL_PRICING,
  estimateTokens,
  detectModel,
  calculateCost,
  calculateDuration,
  detectStatus,
  countToolCalls,
  countFilesChanged,
} from "./lib/trace-metrics";

export interface TraceEntry {
  ts: string;
  sessionId: string;
  prompt: string;
  agents: string[];
  skills: string[];
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  model: string;
  status: string;
  toolCalls: number;
  filesChanged: number;
}

export interface StopHookInput {
  session_id?: string;
  last_assistant_message?: string;
  transcript?: TranscriptMessage[];
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

function buildTrace(
  input: StopHookInput,
  transcript: TranscriptMessage[],
): TraceEntry {
  const prompt = extractFirstUserPrompt(transcript);
  const { agents, skills } = extractAgentsAndSkills(transcript);
  const { inputTokens, outputTokens } = estimateTokens(transcript);
  const tokens = inputTokens + outputTokens;
  const model = detectModel(transcript);

  return {
    ts: new Date().toISOString(),
    sessionId: input.session_id || "unknown",
    prompt,
    agents,
    skills,
    tokens,
    inputTokens,
    outputTokens,
    costUsd: calculateCost(inputTokens, outputTokens, model),
    durationMs: calculateDuration(tokens),
    model,
    status: detectStatus(transcript, input.last_assistant_message || ""),
    toolCalls: countToolCalls(transcript),
    filesChanged: countFilesChanged(transcript),
  };
}

async function writeTrace(trace: TraceEntry): Promise<void> {
  const tracesDir = join(homedir(), ".claude", "traces");
  mkdirSync(tracesDir, { recursive: true });

  const dateStr = new Date().toISOString().split("T")[0];
  const filePath = join(tracesDir, `${dateStr}.jsonl`);

  const file = Bun.file(filePath);
  const existing = (await file.exists()) ? await file.text() : "";
  await Bun.write(filePath, existing + JSON.stringify(trace) + "\n");
}

async function main(): Promise<void> {
  try {
    const raw = await consumeStdin();
    if (!raw.trim()) {
      process.exit(0);
    }

    const input: StopHookInput = JSON.parse(raw);
    const transcript = input.transcript || [];
    const trace = buildTrace(input, transcript);
    await writeTrace(trace);
  } catch {
    // Never block - trace logging is best-effort
  }

  process.exit(0);
}

main();

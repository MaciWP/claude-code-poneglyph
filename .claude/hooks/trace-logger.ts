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

import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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
  sessionId: string | null;
  prompt: string | null;
  agents: string[] | null;
  skills: string[] | null;
  tokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  durationMs: number | null;
  model: string | null;
  status: string;
  toolCalls: number | null;
  filesChanged: number | null;
  rawInput?: Record<string, unknown>;
}

export interface ResolvedTraceEntry {
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
  rawInput?: Record<string, unknown>;
}

export interface StopHookInput {
  session_id?: string;
  last_assistant_message?: string;
  transcript?: TranscriptMessage[];
  stop_hook_event?: string;
  [key: string]: unknown;
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

function buildRawInput(input: StopHookInput): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (key !== "transcript") {
      raw[key] = input[key];
    }
  }
  return raw;
}

function buildTraceWithTranscript(
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
    sessionId: input.session_id ?? null,
    prompt: prompt === "unknown" ? null : prompt,
    agents: agents.length > 0 ? agents : null,
    skills: skills.length > 0 ? skills : null,
    tokens,
    inputTokens,
    outputTokens,
    costUsd: calculateCost(inputTokens, outputTokens, model),
    durationMs: calculateDuration(tokens),
    model,
    status: detectStatus(transcript, input.last_assistant_message ?? ""),
    toolCalls: countToolCalls(transcript),
    filesChanged: countFilesChanged(transcript),
    rawInput: buildRawInput(input),
  };
}

function buildTraceMinimal(input: StopHookInput): TraceEntry {
  return {
    ts: new Date().toISOString(),
    sessionId: input.session_id ?? null,
    prompt: null,
    agents: null,
    skills: null,
    tokens: null,
    inputTokens: null,
    outputTokens: null,
    costUsd: null,
    durationMs: null,
    model: null,
    status: input.stop_hook_event ?? "unknown",
    toolCalls: null,
    filesChanged: null,
    rawInput: buildRawInput(input),
  };
}

function buildTrace(
  input: StopHookInput,
  transcript: TranscriptMessage[],
): TraceEntry {
  if (transcript.length === 0) {
    return buildTraceMinimal(input);
  }
  return buildTraceWithTranscript(input, transcript);
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

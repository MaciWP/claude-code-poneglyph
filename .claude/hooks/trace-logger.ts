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

interface TraceEntry {
  ts: string;
  sessionId: string;
  prompt: string;
  agents: string[];
  skills: string[];
  tokens: number;
  costUsd: number;
  durationMs: number;
  status: string;
}

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface TranscriptMessage {
  role: string;
  content: string | ContentBlock[];
}

interface StopHookInput {
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

function extractFirstUserPrompt(transcript: TranscriptMessage[]): string {
  for (const msg of transcript) {
    if (msg.role !== "user") continue;

    if (typeof msg.content === "string") {
      return msg.content.slice(0, 200);
    }

    if (Array.isArray(msg.content)) {
      const textBlock = msg.content.find(
        (b: ContentBlock) => b.type === "text" && b.text,
      );
      if (textBlock?.text) {
        return textBlock.text.slice(0, 200);
      }
    }
  }

  return "unknown";
}

function extractAgentsAndSkills(transcript: TranscriptMessage[]): {
  agents: string[];
  skills: string[];
} {
  const agents = new Set<string>();
  const skills = new Set<string>();

  for (const msg of transcript) {
    if (msg.role !== "assistant") continue;
    const blocks = Array.isArray(msg.content) ? msg.content : [];
    for (const block of blocks) {
      if (block.type !== "tool_use") continue;
      if (block.name === "Task" || block.name === "Agent") {
        const agentType = block.input?.subagent_type;
        if (typeof agentType === "string") agents.add(agentType);
      }
      if (block.name === "Skill") {
        const skillName = block.input?.skill;
        if (typeof skillName === "string") skills.add(skillName);
      }
    }
  }

  return { agents: [...agents], skills: [...skills] };
}

async function main(): Promise<void> {
  try {
    const raw = await consumeStdin();
    if (!raw.trim()) {
      process.exit(0);
    }

    const input: StopHookInput = JSON.parse(raw);
    const transcript = input.transcript || [];

    const prompt = extractFirstUserPrompt(transcript);
    const { agents, skills } = extractAgentsAndSkills(transcript);

    const trace: TraceEntry = {
      ts: new Date().toISOString(),
      sessionId: input.session_id || "unknown",
      prompt,
      agents,
      skills,
      tokens: 0,
      costUsd: 0,
      durationMs: 0,
      status: "completed",
    };

    const tracesDir = join(homedir(), ".claude", "traces");
    mkdirSync(tracesDir, { recursive: true });

    const dateStr = new Date().toISOString().split("T")[0];
    const filePath = join(tracesDir, `${dateStr}.jsonl`);

    const file = Bun.file(filePath);
    const existing = (await file.exists()) ? await file.text() : "";
    await Bun.write(filePath, existing + JSON.stringify(trace) + "\n");
  } catch {
    // Never block - trace logging is best-effort
  }

  process.exit(0);
}

main();

#!/usr/bin/env bun

/**
 * SubagentStop hook: records structured failure entries for retrospective analysis.
 * Fires when a subagent completes. Writes to ~/.claude/agent-memory/retrospectives/YYYY-MM.jsonl
 * ONLY when: retry_count > 0, final_score < 70, or transcript contains failure signals.
 * Best-effort — always exits 0.
 */

import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  parseTranscript,
  extractAgentType,
  buildResolvedEntry,
  type SubagentStopInput,
  type TranscriptLine,
} from "./agent-scoring";
import { extractMetrics, calculateCompositeScore } from "./lib/agent-scorer-calc";
import { readHookStdin } from "./lib/hook-stdin";

interface RetrospectiveEntry {
  date: string;
  agent: string;
  session_id: string;
  failure_type: "low_score" | "retry_required" | "test_failure" | "unknown";
  task_summary: string;
  skills_loaded: string[];
  retry_count: number;
  final_score: number;
}

function extractTaskSummary(lines: TranscriptLine[]): string {
  for (const line of lines) {
    if (line.role !== "user") continue;
    const content = line.content;
    let text = "";
    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (typeof block === "object" && block !== null && (block as { type?: string; text?: string }).type === "text") {
          text += (block as { text?: string }).text ?? "";
        }
      }
    } else if (content != null) {
      text = JSON.stringify(content);
    }
    if (text.length > 0) return text.slice(0, 200);
  }
  return "";
}

function extractSkillsLoaded(lines: TranscriptLine[]): string[] {
  const skillSet = new Set<string>();
  const skillPattern = /\.claude\/skills\/([^/\s"']+)/g;

  for (const line of lines) {
    const serialized = JSON.stringify(line);
    let match: RegExpExecArray | null;
    while ((match = skillPattern.exec(serialized)) !== null) {
      skillSet.add(match[1]);
    }
  }
  return Array.from(skillSet);
}

function countRetries(lines: TranscriptLine[]): number {
  const text = JSON.stringify(lines);
  const matches = text.match(/\bretry\b|\bSendMessage\b/gi);
  return matches ? matches.length : 0;
}

function hasTestFailure(lines: TranscriptLine[]): boolean {
  const text = JSON.stringify(lines);
  return text.toLowerCase().includes("test failed") || text.includes("NEEDS_CHANGES");
}

function determineFailureType(
  retryCount: number,
  finalScore: number,
  lines: TranscriptLine[],
): RetrospectiveEntry["failure_type"] {
  if (retryCount > 0) return "retry_required";
  if (hasTestFailure(lines)) return "test_failure";
  if (finalScore < 70) return "low_score";
  return "unknown";
}

function getOutputPath(): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return join(homedir(), ".claude", "agent-memory", "retrospectives", `${yearMonth}.jsonl`);
}

async function run(): Promise<void> {
  const raw = await readHookStdin();
  if (!raw.trim()) return;

  const input: SubagentStopInput = JSON.parse(raw);
  if (input.stop_hook_active === true) return;

  const agentId = (input.agent_id as string | undefined) ?? "";
  const transcriptPath = (input.agent_transcript_path as string | undefined) ?? "";
  const rawAgentType = (input.agent_type as string | undefined) ?? "";

  if (!transcriptPath) return;

  const lines = parseTranscript(transcriptPath);
  const agentType = rawAgentType !== "" ? rawAgentType : extractAgentType(agentId);
  if (!agentType) return;

  const retryCount = countRetries(lines);
  const testFailure = hasTestFailure(lines);

  const resolvedEntry = buildResolvedEntry(input, lines, agentType);
  const metrics = extractMetrics([resolvedEntry], agentType);
  const finalScore = calculateCompositeScore(metrics);

  if (retryCount === 0 && !testFailure && finalScore >= 70) return;

  const entry: RetrospectiveEntry = {
    date: new Date().toISOString(),
    agent: agentType,
    session_id: (input.session_id as string | undefined) ?? "unknown",
    failure_type: determineFailureType(retryCount, finalScore, lines),
    task_summary: extractTaskSummary(lines),
    skills_loaded: extractSkillsLoaded(lines),
    retry_count: retryCount,
    final_score: finalScore,
  };

  const outputPath = getOutputPath();
  mkdirSync(join(homedir(), ".claude", "agent-memory", "retrospectives"), { recursive: true });
  appendFileSync(outputPath, JSON.stringify(entry) + "\n", "utf-8");
}

if (import.meta.main) {
  run().catch(() => {}).finally(() => process.exit(0));
}

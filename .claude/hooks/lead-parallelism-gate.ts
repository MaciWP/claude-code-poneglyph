#!/usr/bin/env bun

import { existsSync, appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

interface HookInput {
  tool_name: string;
  tool_input?: {
    subagent_type?: string;
    prompt?: string;
    [key: string]: unknown;
  };
  session_id?: string;
  transcript_path?: string;
}

interface TranscriptEntry {
  role: string;
  content: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
}

interface SkipLogEntry {
  timestamp: string;
  session_id: string;
  agent_type: string;
  user_keywords_matched: string[];
  dependency_reason_found: boolean;
}

const MULTI_TASK_KEYWORDS =
  /\b(y también|también|además|y además|y luego|and also|also|in parallel|en paralelo|both|ambos|todos los|all the)\b/i;

const DEPENDENCY_REASON_KEYWORDS =
  /\b(waiting on|esperando|depende de|depends on|solo delegation|secuencial|after the|después de|tras el|tras la)\b/i;

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", () => resolve(""));
    process.stdin.resume();
  });
}

function extractText(
  content: string | Array<{ type: string; text?: string; [key: string]: unknown }>,
): string {
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join(" ");
}

function readTranscript(transcriptPath: string): TranscriptEntry[] {
  try {
    if (!existsSync(transcriptPath)) return [];
    const raw = require("node:fs").readFileSync(transcriptPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as TranscriptEntry[];
    return [];
  } catch {
    return [];
  }
}

function findLastUserMessage(transcript: TranscriptEntry[]): string {
  for (let i = transcript.length - 1; i >= 0; i--) {
    if (transcript[i].role === "user") {
      return extractText(transcript[i].content);
    }
  }
  return "";
}

function findLastAssistantMessage(transcript: TranscriptEntry[]): string {
  for (let i = transcript.length - 1; i >= 0; i--) {
    if (transcript[i].role === "assistant") {
      return extractText(transcript[i].content);
    }
  }
  return "";
}

function logSkip(entry: SkipLogEntry): void {
  try {
    const logPath = join(homedir(), ".claude", "parallelism-skips.jsonl");
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
  } catch {
    // best-effort — never block
  }
}

async function main(): Promise<void> {
  let input: HookInput;

  try {
    const raw = await readStdin();
    input = JSON.parse(raw) as HookInput;
  } catch {
    process.exit(0);
  }

  if (input.tool_name !== "Agent") {
    process.exit(0);
  }

  const transcriptPath = input.transcript_path;
  if (!transcriptPath || !existsSync(transcriptPath)) {
    process.exit(0);
  }

  try {
    const transcript = readTranscript(transcriptPath);
    if (transcript.length === 0) {
      process.exit(0);
    }

    const userMessage = findLastUserMessage(transcript);
    if (!userMessage) {
      process.exit(0);
    }

    const keywordMatches = userMessage.match(MULTI_TASK_KEYWORDS);
    if (!keywordMatches) {
      process.exit(0);
    }

    const assistantMessage = findLastAssistantMessage(transcript);
    const dependencyReasonFound = DEPENDENCY_REASON_KEYWORDS.test(assistantMessage);

    if (!dependencyReasonFound) {
      const agentType = input.tool_input?.subagent_type ?? "unknown";
      const matchedKeywords = Array.from(new Set(keywordMatches.map((k) => k.toLowerCase())));

      console.error(
        `⚠️  Parallelism gate: user prompt contains multi-task keywords (${matchedKeywords.join(", ")}) but only 1 Agent call detected. Either batch a 2nd Task or state the dependency reason inline (e.g. "solo delegation — esperando scout output").`,
      );

      logSkip({
        timestamp: new Date().toISOString(),
        session_id: input.session_id ?? "",
        agent_type: agentType,
        user_keywords_matched: matchedKeywords,
        dependency_reason_found: false,
      });
    }
  } catch {
    // best-effort — never block Claude Code
  }

  process.exit(0);
}

main().catch(() => process.exit(0));

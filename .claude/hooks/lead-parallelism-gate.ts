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

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: { subagent_type?: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface TranscriptEntry {
  role: string;
  content: string | Array<ContentBlock>;
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

function extractText(content: string | Array<ContentBlock>): string {
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join(" ");
}

/**
 * Extract Agent tool_use blocks from a single assistant message.
 * Returns the list of subagent_type values for each Agent call in the message.
 */
function extractAgentCalls(content: string | Array<ContentBlock>): string[] {
  if (typeof content === "string") return [];
  const agents: string[] = [];
  for (const block of content) {
    if (block.type === "tool_use" && block.name === "Agent") {
      const subtype = block.input?.subagent_type;
      agents.push(typeof subtype === "string" ? subtype : "unknown");
    }
  }
  return agents;
}

/**
 * Walk the transcript from the end, collecting Agent calls from the most recent
 * assistant messages (up to `maxMessages` assistant messages).
 * Each element is the list of Agent subagent_types called in ONE assistant message.
 */
function collectRecentAgentBatches(
  transcript: TranscriptEntry[],
  maxMessages: number,
): string[][] {
  const batches: string[][] = [];
  for (let i = transcript.length - 1; i >= 0 && batches.length < maxMessages; i--) {
    if (transcript[i].role !== "assistant") continue;
    const calls = extractAgentCalls(transcript[i].content);
    if (calls.length > 0) {
      batches.push(calls);
    }
  }
  // Reverse so oldest comes first — not strictly needed but easier to reason about.
  return batches.reverse();
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

    // Cross-turn check: detect sequential Agent delegations across multiple
    // assistant messages that could have been batched.
    const currentAgentType = input.tool_input?.subagent_type ?? "unknown";
    const recentBatches = collectRecentAgentBatches(transcript, 5);

    // Only flag when every recent assistant message had a SINGLE Agent call
    // (i.e. none of them batched). If any message had ≥2, the Lead already
    // parallelized, so don't warn.
    const allSolo = recentBatches.length >= 2 && recentBatches.every((b) => b.length === 1);
    const recentTypes = recentBatches.map((b) => b[0]);
    // Count how many of the recent solo calls share the current subagent_type.
    const sameTypeCount = recentTypes.filter((t) => t === currentAgentType).length;

    // Threshold: ≥2 prior solo calls of the same type (plus current = 3 total).
    if (allSolo && sameTypeCount >= 2) {
      console.error(
        `[lead-parallelism-gate] Detected ${sameTypeCount + 1} sequential \`${currentAgentType}\` delegations across recent turns.\n` +
          `  Consider batching independent delegations in a single message: Agent(...) + Agent(...) + Agent(...)\n` +
          `  If there's a real output-to-input dependency, ignore this warning.`,
      );
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

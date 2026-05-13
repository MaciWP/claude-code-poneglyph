#!/usr/bin/env bun
/**
 * Lead Enforcement Hook (PreToolUse) — Default-allow gate.
 *
 * Philosophy: ENABLEMENT > POLICING. The Lead acts freely by default;
 * the gate blocks only on explicit danger signals.
 *
 * Block rules (orden de evaluación):
 *   1. Negative keywords (destructive remove, forced push, db migration,
 *      schema edit) → block unconditionally.
 *   2. Sensitive paths (.env, *.lock, package.json, .claude/settings.json,
 *      secrets/, credentials/) → require inline declaration:
 *      "sensitive: <reason of at least 8 chars>" in the assistant text.
 *   3. Everything else → allow.
 *
 * Always allowed:
 *   - Subagents (input.agent_id present)
 *   - Read (orientation)
 *   - Writes to ~/.claude/plans|projects/
 *   - Read-only git Bash (status/log/diff/show/branch/remote/config/rev-parse)
 *
 * FREEZE_MODE blocks Edit/Write regardless.
 */

import { existsSync, readFileSync } from "node:fs";

// ── Types ───────────────────────────────────────────────────────────────────

interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface TranscriptEntry {
  type?: string;
  role?: string;
  message?: { role?: string; content?: string | ContentBlock[] };
  content?: string | ContentBlock[];
}

export interface HookInput {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    path?: string;
    command?: string;
    [key: string]: unknown;
  };
  agent_id?: string;
  transcript_path?: string;
}

export type Decision =
  | { action: "allow" }
  | { action: "block"; reason: string };

// ── Pattern sources ─────────────────────────────────────────────────────────

const NEGATIVE_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "destructive-remove", re: /\brm\s+-[a-z]*r[a-z]*f?\b|\brm\s+-[a-z]*f[a-z]*r?\b/i },
  { name: "forced-push", re: /\bforce[\s-]?push\b|--force\b|\bpush\s+-f\b/i },
  { name: "db-migration", re: /\bmigration\b/i },
  { name: "schema-edit", re: /\bschema\s+change\b/i },
];

const SENSITIVE_PATHS: RegExp[] = [
  /\.env(\.|$)/i,
  /(^|\/)package(-lock)?\.json$/i,
  /(^|\/)yarn\.lock$/i,
  /(^|\/)bun\.lockb?$/i,
  /\.claude\/settings(\.local)?\.json$/i,
  /(^|\/)secrets?\//i,
  /(^|\/)credentials?\//i,
];

// "sensitive: <reason>" — reason must be ≥8 chars total (spaces allowed after first non-space).
const SENSITIVE_DECLARATION = /\bsensitive[\s_-]*(?:override)?\s*:\s+\S[^\n]{7,}/i;

const GIT_READONLY = /^git\s+(status|log|diff|show|branch|remote|config\s+--get|rev-parse|describe|ls-files)\b/;

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractText(content: string | ContentBlock[] | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");
}

export function findLastAssistantText(transcriptPath: string | undefined): string {
  if (!transcriptPath || !existsSync(transcriptPath)) return "";
  try {
    const raw = readFileSync(transcriptPath, "utf-8");
    const lines = raw.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      let entry: TranscriptEntry;
      try {
        entry = JSON.parse(line) as TranscriptEntry;
      } catch {
        continue;
      }
      const isAssistant =
        entry.type === "assistant" ||
        entry.role === "assistant" ||
        entry.message?.role === "assistant";
      if (!isAssistant) continue;
      const content = entry.message?.content ?? entry.content;
      const text = extractText(content);
      if (text.trim().length > 0) return text;
    }
  } catch {
    /* best-effort */
  }
  return "";
}

function findNegative(text: string): string | null {
  for (const { name, re } of NEGATIVE_PATTERNS) {
    if (re.test(text)) return name;
  }
  return null;
}

function isSensitivePath(filePath: string): boolean {
  if (!filePath) return false;
  return SENSITIVE_PATHS.some((re) => re.test(filePath));
}

// ── Core decision ───────────────────────────────────────────────────────────

/**
 * Decide whether an Edit/Write/Bash from the Lead should be allowed.
 * Caller handles upstream short-circuits.
 */
export function decide(input: HookInput, assistantText: string): Decision {
  const command = input.tool_input?.command ?? "";
  const filePath =
    input.tool_input?.file_path ?? input.tool_input?.path ?? "";

  // (1) Negative keywords — always block.
  const surfaces = [command, filePath, assistantText].join("\n");
  const negative = findNegative(surfaces);
  if (negative) {
    return {
      action: "block",
      reason: `negative keyword detected ("${negative}") — irreversible or destructive`,
    };
  }

  // (2) Sensitive paths — require explicit declaration.
  if (isSensitivePath(filePath)) {
    if (!SENSITIVE_DECLARATION.test(assistantText)) {
      return {
        action: "block",
        reason: `sensitive path requires inline declaration "sensitive: <reason ≥8 chars>"`,
      };
    }
  }

  // (3) Everything else — allow.
  return { action: "allow" };
}

// ── Message ─────────────────────────────────────────────────────────────────

function blockMessage(tool: string, reason: string, filePath: string): string {
  const sensitive = isSensitivePath(filePath);
  return [
    `[LEAD] ${tool} blocked. ${reason}.`,
    ``,
    sensitive
      ? `Declara inline en tu mensaje (texto libre):\n  "sensitive: <razón ≥8 chars>"\nO delega al builder con contexto:\n  Agent(subagent_type="builder", description="<short>", prompt="<task>")`
      : `Delega al builder:\n  Agent(subagent_type="builder", description="<short>", prompt="<task>")`,
  ].join("\n");
}

// ── Entrypoint ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const input = JSON.parse(await Bun.stdin.text()) as HookInput;
  const tool = input.tool_name ?? "";

  // Subagents bypass everything.
  if (input.agent_id) {
    process.exit(0);
  }

  // FREEZE_MODE blocks Edit/Write regardless.
  if (
    process.env.CLAUDE_FREEZE_MODE === "true" &&
    ["Edit", "Write"].includes(tool)
  ) {
    console.error(
      "🔒 Freeze mode active: Edit/Write blocked. Use /freeze off to deactivate.",
    );
    process.exit(2);
  }

  // Only enforce in Lead mode.
  if (process.env.CLAUDE_LEAD_MODE !== "true") {
    process.exit(0);
  }

  // Read is always allowed (orientation).
  if (tool === "Read") {
    process.exit(0);
  }

  // Writes to Claude's planning/memory dirs are always allowed.
  const filePath = input.tool_input?.file_path ?? input.tool_input?.path ?? "";
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const allowedPaths = [
    `${homeDir}/.claude/plans/`,
    `${homeDir}/.claude/projects/`,
  ];
  if (filePath && allowedPaths.some((p) => filePath.startsWith(p))) {
    process.exit(0);
  }

  // Read-only git Bash is always allowed.
  if (tool === "Bash") {
    const command = (input.tool_input?.command ?? "").trim();
    if (GIT_READONLY.test(command)) {
      process.exit(0);
    }
  }

  // Only Edit/Write/Bash require evaluation. Everything else: allow.
  if (!["Edit", "Write", "Bash"].includes(tool)) {
    process.exit(0);
  }

  const assistantText = findLastAssistantText(input.transcript_path);
  const decision = decide(input, assistantText);

  if (decision.action === "allow") {
    process.exit(0);
  }

  console.error(blockMessage(tool, decision.reason, filePath));
  process.exit(2);
}

if (import.meta.main) {
  main().catch(() => process.exit(0));
}

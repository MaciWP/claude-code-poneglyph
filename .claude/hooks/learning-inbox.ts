#!/usr/bin/env bun

/**
 * Learning Inbox Hook (Stop)
 *
 * Capture-only: at turn end, scans transcript-visible text for candidate
 * learnings and appends them to `.claude/learned/inbox.md`. It NEVER writes
 * to skills/rules/memory — the human ratifies promotions at retro (Phase 5),
 * which consumes and clears the inbox. Exits 0 always; silent when no signals.
 *
 * Heuristics are deterministic regex scans (no LLM calls inside the hook).
 * Confidence is fixed per signal type:
 *   - user-correction  0.7 — explicit human correction is the strongest signal
 *   - error-resolution 0.5 — error→fix co-occurrence may be coincidental
 *   - workaround       0.4 — keyword-only match, weakest signal
 *
 * Inbox entry format (markdown, human-readable for retro):
 *   ## <ISO timestamp> — session <id>
 *   - [<type>] (confidence <n>) "<context snippet>"
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { readHookStdin } from "./lib/hook-stdin";

export interface StopPayload {
  session_id?: string;
  transcript_path?: string;
  stop_hook_active?: boolean;
  cwd?: string;
  /** Tail of the transcript text — populated by main() from transcript_path. */
  transcript_tail?: string;
  [key: string]: unknown;
}

export interface Candidate {
  type: "user-correction" | "error-resolution" | "workaround";
  confidence: number;
  context: string;
}

type SignalDef = [Candidate["type"], RegExp, number];

const SIGNALS: SignalDef[] = [
  [
    "user-correction",
    /(no,?\s+(así no|eso (está|es) mal)|te has equivocado|eso no es lo que (ped[ií]|quer[ií]a)|that'?s (wrong|not right)|you'?re wrong|not what i asked)/i,
    0.7,
  ],
  [
    "error-resolution",
    /\b(\w*error\w*|exception|failed|FAIL(?:ED)?)\b[\s\S]{0,400}?\b(fixed|resolved|solucionado|arreglado|green|passing|pasan? los tests)\b/i,
    0.5,
  ],
  ["workaround", /\b(workaround|apaño|fallback aplicado)\b/i, 0.4],
];

// Self-match guard (feature 019 retro): the assistant's own review/retro prose
// legitimately pairs "error"+"fixed" words and polluted the inbox two features
// in a row. An error-resolution match whose context reads like review/verdict
// meta-prose is discarded — it documents a learning cycle, it isn't one.
const REVIEW_PROSE =
  /\b(verdict|APPROVED|NEEDS_CHANGES|BLOCKED|review\.md|retro|in-review|learning-inbox|inbox)\b/i;

// Snippet window around the match; 160 keeps entries one-line readable.
const CONTEXT_RADIUS = 80;
const CONTEXT_MAX = 160;

function snippet(text: string, index: number, matchLength: number): string {
  const start = Math.max(0, index - CONTEXT_RADIUS);
  const end = Math.min(text.length, index + matchLength + CONTEXT_RADIUS);
  return text
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CONTEXT_MAX);
}

export function extractCandidates(payload: StopPayload): Candidate[] {
  const text = typeof payload.transcript_tail === "string" ? payload.transcript_tail : "";
  if (!text.trim()) return [];

  const candidates: Candidate[] = [];
  for (const [type, pattern, confidence] of SIGNALS) {
    const m = text.match(pattern);
    if (m && m.index !== undefined) {
      const context = snippet(text, m.index, m[0].length);
      if (type === "error-resolution" && REVIEW_PROSE.test(context)) continue;
      candidates.push({ type, confidence, context });
    }
  }
  return candidates;
}

export function appendToInbox(
  candidates: Candidate[],
  inboxPath: string,
  sessionId: string,
  now: Date = new Date(),
): void {
  if (candidates.length === 0) return; // silent no-op — AC1 "no noise"

  mkdirSync(dirname(inboxPath), { recursive: true });
  const lines = candidates.map(
    (c) => `- [${c.type}] (confidence ${c.confidence}) "${c.context}"`,
  );
  const entry = `## ${now.toISOString()} — session ${sessionId}\n${lines.join("\n")}\n\n`;
  appendFileSync(inboxPath, entry, "utf8");
}

// Read up to the last 50KB of the transcript — enough for end-of-turn signals
// without scanning hours of history.
const TAIL_BYTES = 50_000;

function readTranscriptTail(path: string): string {
  try {
    if (!existsSync(path)) return "";
    const size = statSync(path).size;
    const content = readFileSync(path, "utf8");
    return size > TAIL_BYTES ? content.slice(-TAIL_BYTES) : content;
  } catch {
    return "";
  }
}

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    if (!raw.trim()) process.exit(0);
    const payload: StopPayload = JSON.parse(raw);

    // Guard against re-entry while a previous Stop hook chain is active.
    if (payload.stop_hook_active) process.exit(0);

    if (!payload.transcript_tail && typeof payload.transcript_path === "string") {
      payload.transcript_tail = readTranscriptTail(payload.transcript_path);
    }

    const candidates = extractCandidates(payload);
    if (candidates.length > 0) {
      const base = typeof payload.cwd === "string" ? payload.cwd : process.cwd();
      const inbox = join(base, ".claude", "learned", "inbox.md");
      appendToInbox(candidates, inbox, payload.session_id ?? "unknown");
    }
  } catch {
    // best-effort — never block the turn
  }

  process.exit(0);
}

if (import.meta.main) {
  main();
}

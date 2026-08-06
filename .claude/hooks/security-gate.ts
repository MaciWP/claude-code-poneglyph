#!/usr/bin/env bun
// Stop hook: scans recently modified files for potential secret leaks.
// Synchronous + visible: when a secret is suspected it surfaces a `systemMessage`
// to the user (stdout JSON). It NEVER blocks the turn (always exits 0) — it warns,
// it does not gate. Registered WITHOUT `async` so the systemMessage is not discarded.

import { readHookStdin } from "./lib/hook-stdin";

export const SECRET_PATTERN =
  /(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\s*[=:]\s*['"]?[A-Za-z0-9_\-\.]{16,}['"]?/gi;

export const SECRET_PATTERN_CI =
  /(?:password|passwd|secret|api_key|apikey|access_token|accesstoken|private_key|privatekey)\s*[=:]\s*.{8,}/i;

// Markdown is documentation/illustration by nature: how-tos, skill references,
// and PR reports routinely contain `SECRET_KEY=...` / `password: ...` as EXAMPLES.
// SECRET_PATTERN_CI matches that prose en masse, so a stateless Stop hook re-surfaces
// the same false positives every turn — training the user to ignore the gate, which
// is exactly when a REAL leak gets missed. Real secrets live in .env / code / config,
// not in .md. So .md is intentionally NOT scanned; detection in the rest stays intact.
const TEXT_EXTENSIONS = new Set([
  ".ts", ".js", ".json", ".env", ".yaml", ".yml",
]);

export function hasTextExtension(filePath: string): boolean {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return false;
  return TEXT_EXTENSIONS.has(filePath.slice(dot).toLowerCase());
}

// The .claude/ tree is Claude Code orchestration config — hooks, skills, commands,
// rules, settings — i.e. meta-system plumbing, NOT the project's business code where
// a real secret leak matters. By nature it CONTAINS secret-shaped literals: this very
// detector's SECRET_PATTERN, its tests (`API_KEY = "..."`), security how-tos, auth
// skills. Scanning it produces self-matching false positives every turn. The gate
// watches YOUR code; .claude/ is the tool, not the codebase. (.md anywhere is already
// excluded by hasTextExtension.) Tradeoff: a literal secret in .claude/settings.json
// is not caught — acceptable, that's tool config (secrets belong in env/gitignore).
export function isOrchestrationPath(filePath: string): boolean {
  return /(?:^|\/)\.claude\//.test(filePath);
}

// Per-line secret check. Resets the stateful /g regex BEFORE testing — the
// lastIndex gotcha would silently skip alternating lines otherwise.
export function lineHasSecret(line: string): boolean {
  SECRET_PATTERN.lastIndex = 0;
  return SECRET_PATTERN.test(line) || SECRET_PATTERN_CI.test(line);
}

export async function getModifiedFiles(): Promise<string[]> {
  const [stagedProc, untrackedProc] = [
    Bun.spawn(["git", "diff", "--name-only", "HEAD"], { stdout: "pipe", stderr: "pipe" }),
    Bun.spawn(["git", "ls-files", "--others", "--exclude-standard"], { stdout: "pipe", stderr: "pipe" }),
  ];
  const [stagedOut, untrackedOut] = await Promise.all([
    new Response(stagedProc.stdout).text(),
    new Response(untrackedProc.stdout).text(),
  ]);
  await Promise.all([stagedProc.exited, untrackedProc.exited]);
  const all = new Set([...stagedOut.split("\n"), ...untrackedOut.split("\n")]);
  return [...all]
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && hasTextExtension(f) && !isOrchestrationPath(f));
}

// Returns a list of "path:line" hits (empty if none). Pure — no stderr side effects,
// so main() can aggregate hits into a single visible systemMessage.
export async function scanFile(filePath: string): Promise<string[]> {
  const hits: string[] = [];
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return hits;
    const content = await file.text();
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lineHasSecret(lines[i])) {
        hits.push(`${filePath}:${i + 1}`);
      }
    }
  } catch {
    // best-effort — skip unreadable files
  }
  return hits;
}

// Builds the Stop response for a set of hits, or null when clean (028/US4).
// Two channels on purpose: systemMessage reaches the USER; hookSpecificOutput
// .additionalContext reaches the MODEL (CC ≥2.1.163) so it can verify/redact
// in-turn instead of the warning dying on screen (CG-05). Still non-blocking.
export function buildStopResponse(hits: string[]): {
  systemMessage: string;
  hookSpecificOutput: { hookEventName: "Stop"; additionalContext: string };
} | null {
  if (hits.length === 0) return null;
  const list = hits.map((h) => `  - ${h}`).join("\n");
  return {
    systemMessage:
      `[security-gate] Potential secret(s) in recently modified files:\n${list}\n` +
      `Review, then remove and rotate/revoke before committing.`,
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext:
        `[security-gate] Suspected secret(s) at:\n${list}\n` +
        `Before continuing: Read each locus, verify whether it is a real credential; ` +
        `if real, redact it and tell the user to rotate/revoke it. If a false positive, say so explicitly.`,
    },
  };
}

// --- Git discipline (029/US4) -------------------------------------------------
// Measured friction: 10 incidents of unasked git mutations (commits taken over,
// unwanted authorship, pushes). The always-loaded rule is CLAUDE.md §Sensitive
// paths; this is the best-effort mechanical backstop: at Stop, compare the
// turn's git mutations against the user prompt's intent. Warn, never block.

// Full mutating class (critic MAJOR 3, 029): the measured incidents were
// commit/push, but the spec says "fix the input CLASS" — any state-mutating
// git/gh op counts. Read-only ops (log/diff/status/branch --list) never match.
export const GIT_MUTATION_RE =
  /\bgit\s+(?:commit|push|merge|rebase|reset\s+--hard|branch\s+-D)\b|\bgh\s+pr\s+(?:create|merge)\b/;

// A grep-shaped check must scan COMMANDS, not data (run-don't-predict corollary,
// docs/model-uplift-playbook.md —
// this gate's own test fixtures tripped it in production, 2026-08-05): strip
// heredoc bodies and quoted spans before matching, so `cat << EOF ... "git
// commit" ... EOF` and `echo "git push"` never count as mutations. Tradeoff:
// a real mutation hidden inside quotes (`bash -c "git push"`) is missed —
// acceptable for a best-effort warn.
export function stripShellData(command: string): string {
  let out = command;
  // Heredoc: from <<WORD / <<'WORD' / <<-"WORD" up to the line holding WORD.
  out = out.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\s*\1(?:\n|$)/g, " ");
  // Quoted spans (single and double) — data, not invocations.
  out = out.replace(/'[^']*'/g, " ").replace(/"[^"]*"/g, " ");
  return out;
}
// User intent covers his real phrasings (es/EN, typos included in class).
export const COMMIT_INTENT_RE =
  /\b(commit|comm?itea|push|sube|súbelo|subelo|mergea|merge|rebasea|rebase|versiona|guarda los cambios|crea la pr|abre la pr|borra la rama|resetea)\b/i;

// Stop can re-fire when a stop hook's additionalContext keeps the turn going;
// without this guard the gate is stateless and re-warns the same hits in a loop
// (030). stop_hook_active=true marks that continuation — skip everything.
export function shouldSkipStopHook(payload: unknown): boolean {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { stop_hook_active?: unknown }).stop_hook_active === true
  );
}

// Bounded tail read (030): transcripts grow to many MB; loading the whole file
// on EVERY Stop is the heaviest I/O in the hook set. Byte-slice the end instead —
// a cut first line is fine, extractTurnFromTranscript skips malformed lines.
export async function readTranscriptTail(path: string, maxBytes = 256 * 1024): Promise<string> {
  const file = Bun.file(path);
  const size = file.size;
  if (size <= maxBytes) return file.text();
  return file.slice(size - maxBytes).text();
}

export interface TurnExtract {
  userPrompt: string;
  bashCommands: string[];
}

// Walks the transcript JSONL from the end: collects Bash tool_use commands seen
// AFTER the last plain-string user message (the turn's prompt). Malformed lines
// are skipped (best-effort by contract).
export function extractTurnFromTranscript(jsonl: string): TurnExtract {
  const lines = jsonl.split("\n");
  let userPrompt = "";
  const bashCommands: string[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    let event: unknown;
    try {
      event = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const e = event as { type?: string; message?: { content?: unknown } };
    if (e.type === "user" && typeof e.message?.content === "string") {
      userPrompt = e.message.content;
      break; // everything below this is a previous turn
    }
    if (e.type === "assistant" && Array.isArray(e.message?.content)) {
      for (const block of e.message.content as Array<{ type?: string; name?: string; input?: { command?: string } }>) {
        if (block.type === "tool_use" && block.name === "Bash" && typeof block.input?.command === "string") {
          bashCommands.push(block.input.command);
        }
      }
    }
  }
  return { userPrompt, bashCommands: bashCommands.reverse() };
}

export function buildGitDisciplineWarning(
  userPrompt: string,
  bashCommands: string[],
): { systemMessage: string; hookSpecificOutput: { hookEventName: "Stop"; additionalContext: string } } | null {
  const mutations = bashCommands.filter((c) => GIT_MUTATION_RE.test(stripShellData(c)));
  if (mutations.length === 0) return null;
  if (COMMIT_INTENT_RE.test(userPrompt)) return null; // the user asked — no friction
  const list = mutations.map((m) => `  - ${m.slice(0, 120)}`).join("\n");
  return {
    systemMessage:
      `[security-gate] Mutación git ejecutada sin petición aparente del usuario este turno:\n${list}\n` +
      `Regla (CLAUDE.md §Sensitive paths — Git discipline): las mutaciones git son del usuario salvo petición explícita.`,
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext:
        `[security-gate] A git mutation ran this turn without apparent user request:\n${list}\n` +
        `Verify against the user's message; if it was NOT requested, tell the user now, offer to undo ` +
        `(e.g. soft reset), and check no AI authorship was added.`,
    },
  };
}

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    if (!raw.trim()) process.exit(0);

    let payload: { transcript_path?: string } = {};
    try {
      payload = JSON.parse(raw) as { transcript_path?: string };
    } catch {
      // best-effort — unparseable payload → run with defaults
    }
    if (shouldSkipStopHook(payload)) process.exit(0); // re-entry guard (030)

    const files = await getModifiedFiles();
    const hits = files.length > 0 ? (await Promise.all(files.map(scanFile))).flat() : [];
    const secretResponse = buildStopResponse(hits);

    // Git discipline check (029/US4) — reads the turn from the transcript tail.
    let gitResponse: ReturnType<typeof buildGitDisciplineWarning> = null;
    try {
      if (payload.transcript_path) {
        const text = await readTranscriptTail(payload.transcript_path);
        const tail = text.split("\n").slice(-400).join("\n");
        // Cheap prefilter (031): no Bash tool_use serialized in the tail → no git
        // mutation possible this turn; skip the per-line JSONL parse entirely.
        if (tail.includes('"name":"Bash"')) {
          const turn = extractTurnFromTranscript(tail);
          gitResponse = buildGitDisciplineWarning(turn.userPrompt, turn.bashCommands);
        }
      }
    } catch {
      // best-effort — transcript unavailable/unreadable → skip this check
    }

    if (secretResponse || gitResponse) {
      const merged = {
        systemMessage: [secretResponse?.systemMessage, gitResponse?.systemMessage].filter(Boolean).join("\n\n"),
        hookSpecificOutput: {
          hookEventName: "Stop" as const,
          additionalContext: [
            secretResponse?.hookSpecificOutput.additionalContext,
            gitResponse?.hookSpecificOutput.additionalContext,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      };
      process.stdout.write(JSON.stringify(merged) + "\n");
    }
  } catch {
    // best-effort — never block
  }

  process.exit(0);
}

if (import.meta.main) {
  main();
}

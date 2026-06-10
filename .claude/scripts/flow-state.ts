#!/usr/bin/env bun
// flow-state — typed mutations for .claude/plans/{NNN}-{slug}/state.json
// (canonical schema: commands/flow.md Step 4) + the matching tasks/US{n}.md
// frontmatter flip. Replaces the hand-rolled python/sed one-liners that every
// /flow run re-invented (provenance: 2026-06-11 polish plan; 019 ran 6 of them).
//
// Usage:
//   bun .claude/scripts/flow-state.ts close-us US3 [--files "a.md,b.ts"] [--note "..."] [--plan <dir>]
//   bun .claude/scripts/flow-state.ts approve-gate 1-2|2-3            [--plan <dir>]
//   bun .claude/scripts/flow-state.ts verdict APPROVED|APPROVED_WITH_WARNINGS|NEEDS_CHANGES|BLOCKED
//   bun .claude/scripts/flow-state.ts close-feature                   [--plan <dir>]
// Without --plan, auto-detects the single open plan (feature_closed: false) under .claude/plans/.

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface UsHistoryEntry {
  us: string;
  completed_at: string;
  tests_passed: boolean;
  files_touched?: string[];
  execution?: string;
  askuserquestion_count?: number;
}

export interface FlowState {
  spec_slug: string;
  mode: string;
  current_phase: number | string;
  phases_completed: number[];
  gates_approved: { "1->2": boolean; "2->3": boolean };
  us_completed: string[];
  us_pending: string[];
  us_history?: UsHistoryEntry[];
  feature_closed: boolean;
  review_verdict: string | null;
  retro_status: string | null;
  started_at: string;
  updated_at: string;
}

const VERDICTS = ["APPROVED", "APPROVED_WITH_WARNINGS", "NEEDS_CHANGES", "BLOCKED"];

function assertState(s: unknown): FlowState {
  const st = s as FlowState;
  if (!st || typeof st !== "object" || !st.spec_slug || !st.gates_approved) {
    throw new Error("state.json does not match the canonical flow schema (missing spec_slug/gates_approved)");
  }
  return st;
}

export function closeUs(
  state: FlowState,
  usId: string,
  opts: { date: string; files?: string[]; note?: string },
): FlowState {
  if (!state.us_pending.includes(usId)) {
    throw new Error(`${usId} is not pending (pending: [${state.us_pending.join(", ")}])`);
  }
  const entry: UsHistoryEntry = {
    us: usId,
    completed_at: opts.date,
    tests_passed: true, // the build gate forbids closing a US with red tests (Cmd IV)
    files_touched: opts.files ?? [],
    execution: opts.note ?? "inline",
    askuserquestion_count: 0,
  };
  return {
    ...state,
    us_completed: [...state.us_completed, usId],
    us_pending: state.us_pending.filter((u) => u !== usId),
    us_history: [...(state.us_history ?? []), entry],
    updated_at: opts.date,
  };
}

export function approveGate(state: FlowState, gate: "1->2" | "2->3"): FlowState {
  if (gate !== "1->2" && gate !== "2->3") throw new Error(`unknown gate "${gate}" — use 1->2 or 2->3`);
  return {
    ...state,
    gates_approved: { ...state.gates_approved, [gate]: true },
    current_phase: gate === "1->2" ? 2 : 3,
  };
}

export function setVerdict(state: FlowState, verdict: string): FlowState {
  if (!VERDICTS.includes(verdict)) throw new Error(`invalid verdict "${verdict}" — one of ${VERDICTS.join("|")}`);
  const advance = verdict === "APPROVED" || verdict === "APPROVED_WITH_WARNINGS";
  const phases = new Set(state.phases_completed);
  if (advance) [3, 4].forEach((p) => phases.add(p));
  return {
    ...state,
    review_verdict: verdict,
    current_phase: advance ? 5 : state.current_phase,
    phases_completed: [...phases].sort((a, b) => a - b),
  };
}

export function closeFeature(state: FlowState, opts: { date: string }): FlowState {
  if (state.us_pending.length > 0) {
    throw new Error(`cannot close feature with pending USs: [${state.us_pending.join(", ")}]`);
  }
  const phases = new Set(state.phases_completed);
  [1, 2, 2.5, 3, 4, 5].forEach((p) => phases.add(p));
  return {
    ...state,
    phases_completed: [...phases].sort((a, b) => a - b),
    current_phase: "closed",
    retro_status: "approved",
    feature_closed: true,
    updated_at: opts.date,
  };
}

export function flipUsFrontmatter(content: string, date: string): string {
  if (/^status: closed$/m.test(content)) return content; // idempotent
  return content.replace(/^status: approved$/m, `status: closed\nclosed: ${date}`);
}

export async function runCommand(
  command: string,
  args: string[],
  opts: { planDir: string; date: string; files?: string[]; note?: string },
): Promise<void> {
  const statePath = join(opts.planDir, "state.json");
  const raw = await Bun.file(statePath).text();
  let state = assertState(JSON.parse(raw));

  switch (command) {
    case "close-us": {
      const usId = args[0];
      if (!usId) throw new Error("close-us requires a US id");
      state = closeUs(state, usId, opts);
      const usPath = join(opts.planDir, "tasks", `${usId}.md`);
      if (existsSync(usPath)) {
        const flipped = flipUsFrontmatter(await Bun.file(usPath).text(), opts.date);
        await Bun.write(usPath, flipped);
      }
      break;
    }
    case "approve-gate": {
      const gate = (args[0] ?? "").replace("-", "->") as "1->2" | "2->3";
      state = approveGate(state, gate);
      break;
    }
    case "verdict":
      state = setVerdict(state, args[0] ?? "");
      break;
    case "close-feature":
      state = closeFeature(state, opts);
      break;
    default:
      throw new Error(`unknown command "${command}" — close-us | approve-gate | verdict | close-feature`);
  }

  await Bun.write(statePath, JSON.stringify(state, null, 2) + "\n");
}

function detectPlanDir(plansRoot: string): string {
  const open = readdirSync(plansRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{3}-/.test(d.name))
    .map((d) => join(plansRoot, d.name))
    .filter((dir) => {
      try {
        const s = JSON.parse(require("node:fs").readFileSync(join(dir, "state.json"), "utf8"));
        return s.feature_closed === false;
      } catch {
        return false;
      }
    });
  if (open.length !== 1) {
    throw new Error(`expected exactly 1 open plan, found ${open.length} — pass --plan <dir>`);
  }
  return open[0];
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  const positional = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
  const [command, ...args] = positional;

  try {
    const planDir = flag("plan") ?? detectPlanDir(".claude/plans");
    await runCommand(command ?? "", args, {
      planDir,
      date: new Date().toISOString().slice(0, 10),
      files: flag("files")?.split(",").map((f) => f.trim()),
      note: flag("note"),
    });
    console.log(`ok — ${command} applied to ${planDir}`);
  } catch (e) {
    console.error(`flow-state: ${(e as Error).message}`);
    process.exit(1);
  }
}

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
//   bun .claude/scripts/flow-state.ts status                          [--plan <plans-root>]
// Without --plan, auto-detects the single open plan (feature_closed: false) under .claude/plans/.
// `status` instead scans the whole plans root and lists every incomplete lifecycle.

import { readdirSync, existsSync, readFileSync } from "node:fs";
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
  if (state.review_verdict !== "APPROVED" && state.review_verdict !== "APPROVED_WITH_WARNINGS") {
    throw new Error(
      `cannot close feature with review_verdict ${JSON.stringify(state.review_verdict)} — Phase 4 must end APPROVED or APPROVED_WITH_WARNINGS first (Cmd IV)`,
    );
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

// --- status report (US1, plan 025) ---
// Surfaces incomplete lifecycles so the back-half (build->critic->retro) doesn't
// get silently abandoned (audit 2026-06-30; flow.md smell signal line ~281).

export interface PlanScan {
  dir: string;
  slug: string;
  state: FlowState | null; // null = state.json present but unreadable (illegible)
}

// Scans a plans ROOT and returns the OPEN plans (feature_closed === false) plus
// any plan whose state.json is present-but-malformed (surfaced as illegible).
// Best-effort: a missing root or a dir without state.json never throws.
export function findOpenPlans(plansRoot: string): PlanScan[] {
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(plansRoot, { withFileTypes: true });
  } catch {
    return []; // root absent / unreadable → no open plans
  }
  const out: PlanScan[] = [];
  for (const d of entries) {
    if (!d.isDirectory() || !/^\d{3}-/.test(d.name)) continue;
    const dir = join(plansRoot, d.name);
    const sp = join(dir, "state.json");
    if (!existsSync(sp)) continue; // not a flow-managed plan
    try {
      const st = JSON.parse(readFileSync(sp, "utf8")) as FlowState;
      if (st.feature_closed === false) out.push({ dir, slug: d.name, state: st });
    } catch {
      out.push({ dir, slug: d.name, state: null }); // illegible — surfaced, not dropped
    }
  }
  return out;
}

// One-line summary of a plan's lifecycle position (slug, phase, gates, US counts).
export function summarizeState(state: FlowState): string {
  const g = state.gates_approved;
  const gates = `1→2:${g["1->2"] ? "✓" : "·"} 2→3:${g["2->3"] ? "✓" : "·"}`;
  const done = state.us_completed.length ? state.us_completed.join(",") : "—";
  const pend = state.us_pending.length ? state.us_pending.join(",") : "—";
  return `${state.spec_slug} — phase ${state.current_phase} | gates ${gates} | done(${state.us_completed.length}): ${done} | pending(${state.us_pending.length}): ${pend}`;
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

  // Every persisted mutation refreshes updated_at (flow.md: "state.json updates
  // ON EVERY phase transition") — covers approve-gate/verdict, idempotent for the rest.
  state = { ...state, updated_at: opts.date };
  await Bun.write(statePath, JSON.stringify(state, null, 2) + "\n");
}

function detectPlanDir(plansRoot: string): string {
  let dirEntries: ReturnType<typeof readdirSync>;
  try {
    dirEntries = readdirSync(plansRoot, { withFileTypes: true });
  } catch {
    throw new Error(`plans root not found at ${plansRoot} — run from the repo root or pass --plan <dir>`);
  }
  const open = dirEntries
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

  // `status` scans the plans ROOT (all plans) — handled before detectPlanDir,
  // which requires exactly one open plan and would throw here.
  if (command === "status") {
    const root = flag("plan") ?? ".claude/plans";
    if (!existsSync(root)) {
      // Distinguish "wrong path" from "all closed" — a missing root must not read as success.
      console.error(`flow-state: plans root not found at ${root} — run from the repo root or pass --plan <plans-root>`);
      process.exit(1);
    }
    const open = findOpenPlans(root);
    if (open.length === 0) {
      console.log("flow: no open plans (all features closed)");
    } else {
      console.log(`flow: ${open.length} open plan(s) under ${root}:`);
      for (const p of open) {
        console.log(p.state ? `  ${summarizeState(p.state)}` : `  ${p.slug} — ⚠️ unreadable state.json`);
      }
    }
    process.exit(0);
  }

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

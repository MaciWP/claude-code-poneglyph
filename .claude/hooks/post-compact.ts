#!/usr/bin/env bun

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Open-plans reminder (US2, plan 025). Inline scan — deliberately does NOT import
// .claude/scripts/flow-state.ts: this hook is symlinked into ~/.claude/ (synced)
// but scripts/ is NOT synced, so the import would break there. ~8 duplicated lines
// beat a cross-tier coupling (Commandment V). Best-effort: never throws.
export function openPlansReminder(plansRoot = ".claude/plans"): string | null {
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(plansRoot, { withFileTypes: true });
  } catch {
    return null; // no plans dir (other project / not poneglyph) → no reminder
  }
  const open: string[] = [];
  for (const d of entries) {
    if (!d.isDirectory() || !/^\d{3}-/.test(d.name)) continue;
    const sp = join(plansRoot, d.name, "state.json");
    if (!existsSync(sp)) continue;
    try {
      const st = JSON.parse(readFileSync(sp, "utf8")) as { feature_closed?: boolean; current_phase?: unknown };
      if (st.feature_closed === false) open.push(`- ${d.name} (phase ${st.current_phase ?? "?"})`);
    } catch {
      // Illegible state.json SURFACES instead of hiding (027/US1, matching
      // flow-state.ts `status` semantics) — a corrupt lifecycle is still open.
      open.push(`- ${d.name} — ⚠️ unreadable state.json`);
    }
  }
  if (open.length === 0) return null;
  return [
    "## Planes /flow abiertos (recordatorio, no bloqueante)",
    "Hay lifecycles a medias — estado: `bun $HOME/.claude/scripts/flow-state.ts status`:",
    ...open,
    "Acción de primer turno: si la tarea del usuario no lo impide, ofrece en UNA línea cerrar el más antiguo (`/flow --resume <slug>` → critic/retro pendiente) o archivarlo. Ofrécelo una sola vez; si el usuario lo ignora, no insistas el resto de la sesión.",
  ].join("\n");
}

export const LEAD_REMINDER = [
  "## Lead Orchestrator Mode (re-injected after compaction)",
  "This session operates as Lead Orchestrator — orchestrator-first, but bounded work (1-3 units) runs inline; do not over-delegate.",
  "Spawn decision tree (canonical in orchestrator-protocol; agent usage: CLAUDE.md §Agents for cheap reads — sonnet max, haiku if basic): 1 agent is forbidden; 1-3 units → inline; ≥4 independent units → Workflow (opt-in); massive read-only exploration → Explore (inherits session model). No custom work-agents.",
  "Lead default-allow gate is on: Edit/Write/Bash work directly unless touching sensitive paths or destructive ops. A single unit of work — even ≥5 files — stays inline ('isolation' is not a reason to spawn).",
  "Planning lives in Skill('tech-plan'); error diagnosis in Skill('diagnostic-patterns') — both Lead-invoked. Use Skill() for context, AskUserQuestion() to clarify.",
].join("\n");

export function getSessionMode(): string | null {
  const mode = Bun.env.CLAUDE_LEAD_MODE;
  if (mode === "true") {
    return "## Session Mode\nCLAUDE_LEAD_MODE=true (Lead Orchestrator active)";
  }
  return null;
}

export function buildOutput(plansRoot = ".claude/plans"): string {
  // ANTI_HALLUCINATION block cut (030): CLAUDE.md reloads at the same compaction
  // instant (proven via instructions-loaded.log) and already carries the checklist.
  const sections: string[] = [LEAD_REMINDER];

  const modeSection = getSessionMode();
  if (modeSection) {
    sections.push(modeSection);
  }

  const plansSection = openPlansReminder(plansRoot);
  if (plansSection) {
    sections.push(plansSection);
  }

  return sections.join("\n\n");
}

async function main(): Promise<void> {
  try {
    console.log(buildOutput());
  } catch {
    // best-effort — never block Claude Code
  }

  process.exit(0);
}

if (import.meta.main) {
  main();
}

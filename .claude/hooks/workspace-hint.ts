#!/usr/bin/env bun

// SessionStart workspace hint (relocated from session-start-plans.ts, cut
// post-audit 2026-08-07 — the open-plans reminder measured 1/9 follow-through
// and was retired; this location-conditional hint was ratified to survive).
//
// Location-conditional skill hint (030): sessions inside the Bjumper workspace
// get ONE line pointing at worktrees-bjumper (topology + navigation). Rules
// `paths:` frontmatter only documents project-relative globs, so cwd-matching
// here is the deterministic route. Separator-agnostic (macOS/Windows).
// Best-effort: never blocks the session; silent outside the workspace.
// Content mirrors skills/worktrees-bjumper/references/workspace-topology.md —
// only STABLE facts (paths, layout, CLI verbs, discovery commands); the env
// list changes, so discovery commands are given instead of a snapshot.
export function bjumperWorkspaceHint(cwd: string): string | null {
  if (!/[\\/]Bjumper[\\/]REPOSITORIOS(?:[\\/]|$)/.test(cwd)) return null;
  return [
    "## Workspace Bjumper",
    "Root: `/Users/oriol/Desktop/Bjumper/REPOSITORIOS/PYTHON`",
    "- Repos principales (checkouts main, compartidos): `binora-backend` (Django) · `binora-frontend` (React/Vite) · `binora-contract` (OpenAPI) · `binora-mcp` · `bjumper-worktrees` (el CLI de envs)",
    "- Worktrees: `<root>/worktrees/<env>/<repo>/` — un env aislado por ticket (p.ej. `worktrees/jrv-1077/binora-frontend`); dentro esperarás checkouts HERMANOS de los repos que el ticket necesita, con Docker propio, bloque de puertos sin colisión y seed de datos dev",
    "- Cómo funciona: `bjumper-worktrees/devenv.py` provisiona y gestiona el ciclo completo — `doctor · create · list · start/stop · logs · remove`",
    "- Orientación: `git worktree list` (¿dónde estoy?) · `ls \"$(dirname \"$(git rev-parse --show-toplevel)\")\"` (hermanos del env)",
    "Detalle y precauciones: Skill(worktrees-bjumper).",
  ].join("\n");
}

if (import.meta.main) {
  try {
    const out = bjumperWorkspaceHint(process.cwd());
    if (out) console.log(out);
  } catch {
    // best-effort — never block session start
  }
  process.exit(0);
}

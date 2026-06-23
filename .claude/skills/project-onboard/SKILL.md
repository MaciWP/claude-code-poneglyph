---
name: project-onboard
description: |
  Bootstrapea y personaliza la capa `.claude/` de CUALQUIER repo de trabajo: analiza el codebase (stack, test runner, comandos de lint/build, convenciones, dominios) y propone un set de componentes ratificable — CLAUDE.md de proyecto conciso, rules/test-policy.md con el nivel correcto, skills/commands específicos, rules por path, sugerencias MCP y el comando de verificación cableado. Todo es propuesta que el usuario ratifica.
  Úsala cuando: empezar a trabajar en un repo nuevo, "configura claude para este proyecto", "onboard este repo", "bootstrap .claude", "crea la capa de proyecto".
  Keywords - onboard, onboarding, project-onboard, bootstrap, configura
  proyecto, capa de proyecto, project layer, setup claude, CLAUDE.md
  proyecto, test-policy, new repo, repo nuevo, personalizar claude
argument-hint: "[repo path — defaults to cwd] [--merge if .claude/ exists]"
when_to_use: |
  "configura claude para este proyecto", "onboard este repo", "bootstrap .claude", "capa de proyecto", "setup claude for this repo"
---

# Project Onboard

Lands poneglyph's quality floor on real work repos: one command analyzes the codebase and proposes a personalized `.claude/` layer — the global layer (poneglyph) provides the doctrine; this skill generates the project layer that makes Commandments III/IV/V bite where Oriol actually works.

## Underlying principle

> "Perfect code of the wrong thing is worthless" (Cmd V) — and a global doctrine without a project layer never touches the code. Everything generated is a PROPOSAL: analysis is free, writes are ratified (Cmd I).

## When to use

| Trigger | Example |
|---|---|
| New work repo without `.claude/` | "configura claude para este proyecto" |
| Existing repo with a stale/handmade project layer | `--merge` mode: propose deltas, never overwrite silently |
| Verification command unknown to Claude in this repo | The test/lint wiring alone justifies a run |

## When to skip

| Anti-trigger | Why |
|---|---|
| Inside poneglyph itself | This repo IS the global layer — onboarding it onto itself is circular |
| Throwaway scripts / one-file experiments | A project layer is ceremony there (Cmd III) |

## Workflow

### Step 1 — Analyze (read-only, inline)

Run the checklist in `references/01-analysis-and-menu.md` §Analysis. Detect at minimum:

| Dimension | Where to look |
|---|---|
| Stack + package manager | `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` / lockfiles |
| Test runner + REAL command | test configs, `scripts` block, CI workflows (`.github/workflows`) |
| Lint / typecheck / build commands | same sources — commands Claude can't guess are CLAUDE.md gold |
| Conventions | naming, dir structure, 2-3 representative source files |
| Domain boundaries | top-level dirs with distinct vocabularies (candidates for path rules / project skills) |
| Test reality | what the tests actually cover → test-policy level proposal |
| Existing `.claude/` | if present → merge mode: read everything first, propose deltas only |
| External services | DBs, issue trackers, APIs in configs → MCP suggestion candidates |
| Codebase scale + code ratio | count of source files vs docs/config; large + code-dominant → knowledge-graph tooling candidate (see Step 2) |

NEVER invent a command — every command cited must be verbatim from a config file or CI workflow (Cmd II). If no test command exists, say so honestly.

### Step 2 — Propose the component menu (AskUserQuestion)

Map findings → component candidates using `references/01-analysis-and-menu.md` §Menu criteria. Present ONE AskUserQuestion (multiSelect) with the candidates that earned their place, each with a 1-line evidence-based justification:

| Component | Proposed when |
|---|---|
| `CLAUDE.md` (project) | Always — the floor |
| `.claude/rules/test-policy.md` | Always — level proposed from test reality (business-critical / mixed / auxiliary) |
| Verification wiring | Always — discovered test/lint command into CLAUDE.md §Verification |
| Path-scoped rules | Clear domain boundaries with distinct conventions |
| Project skills | Recurring domain knowledge a generic model gets wrong (query patterns, API conventions, domain gotchas) |
| Project commands | Repeated multi-step workflows visible in scripts/CI |
| MCP suggestions | External services detected (suggestion only — connectors configure outside the repo) |
| Knowledge-graph tooling ([Graphify](https://github.com/safishamsi/graphify)) | ONLY for large, code-dominant, unfamiliar codebases where orientation cost dominates (hundreds of source files, navigation-by-grep). NOT for small repos or markdown/config-heavy ones — there the token savings ≈ 0 and the PreToolUse hook adds unreliable overhead. Suggestion only (installs per-repo outside poneglyph's global layer). Rationale: `plans/022-graph-tooling/decision-memo.md` |
| `.claude/settings.json` (project) | Project-specific permissions/hooks genuinely needed |

The user ratifies the set BEFORE any generation. Components not ratified are not generated — no orphan files.

### Step 3 — Generate each ratified component (proposal → ratify → write)

Per component, in this order (cheap → expensive):

1. **CLAUDE.md** from `templates/claude-md.template.md` — HARD CAP 100 lines. Per-line test: "would removing this cause mistakes?" — if Claude could infer it from the code, it does NOT go in. Content: commands (verbatim), style rules that DIFFER from defaults, gotchas, verification section.
2. **test-policy.md** from `templates/test-policy.template.md` — propose the level with the evidence (what the tests cover); the user ratifies the level explicitly.
3. **Path rules / project skills / commands** — generate via `meta-create` (Read its `references/01-authoring-rubric.md` for skills — eval-first applies to project skills too) and `meta-settings-cookbook` templates. Do not duplicate their knowledge here.
4. **MCP suggestions** — a short ratifiable list in the report (what + why), not config writes.

Show each generated artifact to the user BEFORE writing. Batch ratification is fine (one AskUserQuestion for the set of drafts); silent writes are not.

### Step 4 — Wire verification

The discovered test/lint command lands in the generated CLAUDE.md §Verification: "After each change run `<command>` — never report completed without it passing" (Cmd IV, executable in THIS repo). If no test command exists, the section says so and proposes the smallest viable starting point instead of inventing one.

### Step 5 — Smoke + report

1. Run the discovered verification command once — confirm it actually works as documented.
2. Report: components written, components deferred, every command verbatim-cited to its source file.

## SIEMPRE rules

- EVERYTHING is a proposal — no file is written before the user ratifies it (Cmd I).
- Commands verbatim from config/CI — never invented (Cmd II). No test command found → honest gap, not a guess.
- Generated CLAUDE.md ≤100 lines, biased LEAN — per-line "would removing this cause mistakes?" test (Cmd III).
- Merge mode on existing `.claude/`: read first, propose deltas, never overwrite silently (Cmd VI).
- Project skills go through the `meta-create` authoring rubric (eval-first: ≥3 scenarios or written justification).
- English in generated files; Spanish at runtime with the user.

## Adaptation

| Signal | Adaptation |
|---|---|
| Tiny repo (<20 files, no tests) | CLAUDE.md + honest no-tests note only; skip the rest of the menu |
| Monorepo with packages | Ask whether to onboard root, one package, or both (root CLAUDE.md + per-package additions) |
| Existing rich `.claude/` | Pure merge mode — audit + deltas; flag rot (dead refs, stale commands) like a mini truth-sweep |
| No write ratification given | Stop after the report — the analysis itself is the deliverable |

## Edge cases

- **No tests at all** → test-policy proposes `auxiliary` with the explicit note "no tests found — level provisional"; verification wiring proposes the smallest viable check (typecheck/lint) instead.
- **CI commands diverge from package scripts** → cite both, prefer CI (it's what actually gates), flag the divergence.
- **`.claude/` exists with a CLAUDE.md >200 lines** → propose a diet (the official guidance caps at ~200; poneglyph generates ≤100), never append to bloat.
- **User ratifies only part of the menu** → generate exactly that subset; record deferred components in the report.

## Verification (eval-first — the 3 scenarios this skill must pass)

| # | Scenario | Expected |
|---|---|---|
| E1 | TS/bun repo, tests in `__tests__/`, scripts in package.json | Proposes auxiliary-or-mixed test-policy with evidence; CLAUDE.md ≤100 lines citing `bun test` verbatim; no invented commands |
| E2 | Python repo, pytest + business-logic tests, CI workflow | Proposes `business-critical`; wires the CI's pytest invocation; flags scripts/CI divergence if any |
| E3 | Repo with zero `.claude/` and zero tests | CLAUDE.md + honest "no tests found" note; smallest-viable verification proposed; NO test command invented |

Plus: this skill itself passes the `meta-create/references/01-authoring-rubric.md` checklist (description D1-D4, body B1-B9, references R1-R5).

## Deep references (Read on demand)

| Topic | File | Contents |
|---|---|---|
| Analysis checklist + component-menu criteria | `references/01-analysis-and-menu.md` | What to detect per stack and where; the evidence threshold each component type needs before being proposed. Read at Steps 1-2 of every run. |
| Lean CLAUDE.md template | `templates/claude-md.template.md` | The ≤100-line skeleton with the include/exclude test inline. Read at Step 3.1. |
| test-policy template | `templates/test-policy.template.md` | The 3-level policy skeleton (mirrors poneglyph's canonical levels). Read at Step 3.2. |

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Todo es propuesta ratificable; merge mode nunca pisa en silencio |
| II | Comandos verbatim de config/CI; gaps declarados, nunca inventados |
| III | Generador sesgado a magro; CLAUDE.md ≤100 con test por línea |
| IV | Comando de verificación real cableado donde se trabaja |
| V | Análisis del repo ANTES de proponer nada |

---
us: US5
title: best-of-n skill — claude -p --worktree ×2-3, suite selects, outcomes logged
wave: W1
depends_on: []
tdd_mode: optional
estimate: S
status: closed
closed: 2026-06-10
---

# US5 — best-of-n pilot skill + outcome log

## Execution prompt (Phase 3 input)

**Task**: Create the `best-of-n` skill — a named, on-demand pattern that runs 2-3 headless `claude -p` variants in isolated git worktrees on a hard+testable task, selects by test suite (human diff-review as tiebreak), cleans up worktrees, and logs every outcome.
**Context**: Pattern constraints are LOCKED by `.claude/plans/018-evidence-roadmap/decision-memo-W1.md` D1: N=2-3 never more; eligibility = ONLY hard tasks (high expected single-attempt failure) WITH a runnable check; selection = run project test suite per worktree, pick green, human tiebreak on multi-green; NO LLM-judge selector ever; `-p` worktrees leak → explicit `git worktree remove` cleanup step is part of the pattern; status = PILOT generating novel evidence (no published N=2-5 test-selection data). Skill creation canon: `meta-create` skill (frontmatter with description "Use when:" + "Keywords -"). Log home: `.claude/learned/` (existing dir).
**Constraints**: Skill is procedural markdown — the Lead executes it with Bash; no hook, no automation, invocation is explicitly manual per task (out-of-scope: making it a default mode). Verify the current `claude -p` worktree flag surface via `claude --help` BEFORE writing literal commands (open question #2 — flags may have evolved since the 018 evidence). Log schema (markdown table): date, task, N, attempts-green, selected-by (suite|human), tokens/cost estimate, win vs single-attempt judgment, notes. English only.
**Deliverable**: `.claude/skills/best-of-n/SKILL.md`, `.claude/learned/best-of-n-log.md` (seeded with schema header + zero rows).
**Verify**: skill registers (frontmatter parses; matches meta-create canon); log file exists with schema; `bun test ./.claude/hooks/` green.
**Ask first**: if `claude --help` shows no worktree-related flag for `-p`, ask before substituting manual `git worktree add` wrapping.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | none |
| **Files touched** | `.claude/skills/best-of-n/SKILL.md`, `.claude/learned/best-of-n-log.md` |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | `claude --help` → confirm flag surface; then meta-create canon for skill scaffold |
| **Decisión absorbida** | — |

## User story

- **As a**: Oriol facing a hard task with a runnable check
- **I want**: a named best-of-N pattern with mandatory outcome logging
- **So that**: each use generates the evidence the field lacks (W1 declared gap) and the promotion decision is data-driven

## Acceptance criteria

- **AC1**: Given a hard+testable task, when the skill is followed, then 2-3 variants run in isolated worktrees, the suite selects, worktrees are removed, and a log row is appended. (spec AC5)
- **AC2**: Given the SKILL.md, when read, then eligibility gate (hard + runnable check), N cap (2-3), no-LLM-judge rule, and cleanup step are explicit with W1 D1 citations.
- **AC3**: Given the skill triggers, when a task is easy or lacks a runnable check, then the skill says do NOT use the pattern (anti-trigger documented).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/best-of-n/SKILL.md` | Pattern procedure + eligibility + logging discipline |
| `.claude/learned/best-of-n-log.md` | Schema header, empty table |

## Workflow detallado

1. `claude --help` — verify flag surface for headless + worktree.
2. Scaffold per meta-create canon (description, when-to-use, anti-triggers, workflow, smells, commandments).
3. Seed the log file.
4. Run Verify block.

## Smell signals

- ⚠️ Log stays empty after 3+ hard tasks → pattern is shelf-ware; surface at next retro (pilot needs data or a cut).

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Eligibility gate keeps the expensive pattern off easy tasks |
| IV | Selection is test-suite-driven — verification, not vibes |
| IX | Mandatory logging generates novel evidence (declared 018 gap) |

## Verificación post-implementación

- Smoke: frontmatter parses; log schema present.
- `bun test ./.claude/hooks/` sigue green.

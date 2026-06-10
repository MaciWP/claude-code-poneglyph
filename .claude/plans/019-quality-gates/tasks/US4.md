---
us: US4
title: Evals corpus — ~20 real-failure cases + README protocol + workflow wiring
wave: W2
depends_on: [US3]
tdd_mode: optional
estimate: M
status: closed
closed: 2026-06-10
---

# US4 — Evals corpus + protocol + wiring

## Execution prompt (Phase 3 input)

**Task**: Harvest ~20 golden-prompt cases from REAL documented failures into `.claude/evals/cases.jsonl` (US3 schema), write the harness protocol README, and wire "run evals" into the meta-config change workflow.
**Context**: Harvest sources (each case cites one): `~/.claude/projects/.../memory/` feedback entries (banned openers, BLUF, terse-vs-scannable, default-brief…), `.claude/plans/01[4-8]-*/retro.md` friction sections, `.claude/learned/inbox.md`, `output-styles/poneglyph.md` kill-list + label rules, skill-trigger failures documented in `_research-skill-activation-2026-06-09.md`. Protocol constraints from `decision-memo-W2.md` D1/D4: run on every meta-config change, expect ≈100% pass, any fail → SUSPECT THE EVAL FIRST (Anthropic's 42%→95% grading-bug incident), 2-3 trials on stochastic criteria, rubric-as-trend never gate, no suite growth past 50, cases clustered (no near-duplicates).
**Constraints**: NO synthetic filler — if real failures yield <20 distinct clustered cases, ship fewer and declare the count (spec out-of-scope). Each case's `source` field cites its origin file. Wiring = add an explicit "run `bun .claude/evals/run.ts`" verification step to `meta-create` SKILL.md (post-implementation verification section) and `meta-settings-cookbook` SKILL.md — one line each, no new always-loaded rules (IFScale: every rule displaces). English only.
**Deliverable**: `.claude/evals/cases.jsonl`, `.claude/evals/README.md`, 1-line edits to `.claude/skills/meta-create/SKILL.md` + `.claude/skills/meta-settings-cookbook/SKILL.md`.
**Verify**: `bun .claude/evals/run.ts --dry` (or schema-validate pass) parses all cases; every case has non-empty `source`; `grep -c "near-duplicate check: clusters declared in README"` — README lists case clusters; `bun test ./.claude/hooks/ ./.claude/evals/` green.
**Ask first**: if harvest yields <12 solid cases, ask whether to ship short or defer corpus growth.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US3] |
| **Blocks** | none |
| **Files touched** | `.claude/evals/cases.jsonl`, `.claude/evals/README.md`, `meta-create/SKILL.md`, `meta-settings-cookbook/SKILL.md` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Harvest pass over memory + retros + inbox; cluster candidates before writing JSONL |
| **Decisión absorbida** | — |

## User story

- **As a**: Oriol changing any meta-config file
- **I want**: a named, documented regression step with real-failure cases
- **So that**: "run the evals" is workflow, not tribal knowledge (spec AC4)

## Acceptance criteria

- **AC1**: Given `cases.jsonl`, when audited, then ~20 cases (or fewer, declared) each cite a real-failure `source` and map to a US3 grader. (spec AC3)
- **AC2**: Given README.md, when read, then it states: cadence (per meta-config change), expected ≈100%, suspect-the-eval-first protocol, pass^k trials policy, ≤50-case cap, cluster list.
- **AC3**: Given `meta-create` + `meta-settings-cookbook`, when read, then running the harness is an explicit verification step. (spec AC4)

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/evals/cases.jsonl` | ~20 harvested cases |
| `.claude/evals/README.md` | Protocol (cadence, suspect-eval-first, trials, cap, clusters) |
| `.claude/skills/meta-create/SKILL.md` | +1 verification line |
| `.claude/skills/meta-settings-cookbook/SKILL.md` | +1 verification line |

## Workflow detallado

1. Harvest: sweep sources; list candidates with origin.
2. Cluster; cut near-duplicates; target ~20.
3. Author JSONL against US3 schema; smoke-parse with run.ts.
4. Write README protocol.
5. Wire the 2 one-line verification steps.
6. Run Verify block.

## Smell signals

- ⚠️ A case has no traceable source → it is synthetic; cut it.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Every case traces to a documented real failure |
| IX | Closes the self-improvement loop: failures become permanent regression checks |
| III | ≤50 cap + no filler — suite stays maintainable |

## Verificación post-implementación

- Smoke: run.ts parses all cases; offline grade on any stored fixture.
- `bun test ./.claude/hooks/ ./.claude/evals/` green.

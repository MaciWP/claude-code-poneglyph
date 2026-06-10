---
us: US3
title: Evals harness — deterministic graders (bun, TDD) + runner skeleton
wave: W1
depends_on: []
tdd_mode: forced
estimate: M
status: closed
closed: 2026-06-10
---

# US3 — Evals harness (graders + runner)

## Execution prompt (Phase 3 input)

**Task**: Create `.claude/evals/` with deterministic TS graders (red→green, `tdd: forced`) and a runner skeleton that executes golden-prompt cases via `claude -p --output-format stream-json` and grades transcripts offline.
**Context**: Greenfield — `.claude/evals/` does not exist. Mirror bun-test conventions from `.claude/hooks/__tests__/*.test.ts`. Harness constraints from `.claude/plans/018-evidence-roadmap/decision-memo-W2.md` D1/D2/D4: deterministic/code-graded first, NEVER pairwise/LLM-judge, 2-3 trials on stochastic criteria (pass^k), runner pattern `claude -p --output-format stream-json` + JSONL parse (session auth, no API key). Grader set (from D2 targets + poneglyph.md rules): `skillTriggerParse` (Skill() invocations in transcript JSONL), `bannedOpeners` (the poneglyph.md kill-list ES+EN), `esEsDetect` (language heuristic for prose-to-user), `blufPosition` (answer-first heuristic), `labelPresence` (confidence-label regex `[Seguro]/[Probable]/[Suposición]` with payload).
**Constraints**: Graders = pure functions `(transcript: string, caseSpec) => {pass, detail}` — no I/O, no network, no model calls; only the runner shells out to `claude`. Case schema (locks US4): JSONL `{id, prompt, type, grader, expected, trials?, source}`. Runner supports `--offline <transcript-dir>` to grade stored fixtures (tests use this path). TypeScript + bun, `#!/usr/bin/env bun`. No new npm dependencies.
**Deliverable**: `.claude/evals/graders.ts`, `.claude/evals/run.ts`, `.claude/evals/__tests__/graders.test.ts` (+ fixtures inline or under `__tests__/fixtures/`).
**Verify**: `bun test ./.claude/evals/` green (graders red→green evidence in commit sequence); `bun test ./.claude/hooks/` still green; `bun .claude/evals/run.ts --offline <fixture-dir>` exits 0 with a per-case report.
**Ask first**: nothing — schema and grader set locked above; if a grader proves un-implementable deterministically, drop it and declare (do not add an LLM judge).

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | [US4] |
| **Files touched** | `.claude/evals/graders.ts`, `.claude/evals/run.ts`, `.claude/evals/__tests__/graders.test.ts` |
| **TDD-mode** | forced — graders are pure functions with non-trivial logic (BLUF heuristic, language detect) |
| **Estimate** | M |
| **Cómo arrancar** | Write `graders.test.ts` first (red) with fixture transcripts per grader |
| **Decisión absorbida** | Eval case schema (JSONL) — consumed by US4 |

## User story

- **As a**: Oriol editing meta-config (CLAUDE.md, output-style, skill descriptions)
- **I want**: a deterministic harness that grades model behavior against poneglyph's own named rules
- **So that**: regressions surface mechanically instead of being noticed sessions later (Commandments IV, IX)

## Acceptance criteria

- **AC1**: Given a fixture transcript violating each rule, when its grader runs, then it fails with a precise detail string; given a compliant transcript, it passes. (per grader — 5 graders)
- **AC2**: Given `run.ts --offline <dir>`, when executed, then per-case pass/fail + aggregate report print and exit code reflects failures.
- **AC3**: Given the test file history, when reviewed, then tests existed before implementation (red→green — `tdd: forced`).
- **AC4**: Given `graders.ts`, when read, then no I/O/network/model-call path exists in any grader (spec constraint).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/evals/graders.ts` | 5 pure grader functions + types |
| `.claude/evals/run.ts` | Case loader (JSONL), claude -p executor, offline mode, report |
| `.claude/evals/__tests__/graders.test.ts` | Red-first suite with fixture transcripts |

## Workflow detallado

1. Define case schema types + grader signatures.
2. RED: write `graders.test.ts` — ≥2 fixtures (pass + fail) per grader.
3. GREEN: implement graders.
4. Runner skeleton: JSONL load → execute (`claude -p`) or `--offline` → grade → report; pass^k for `trials: 2-3` cases.
5. Run Verify block.

## Drillme (Socratic check)

1. `[approach]` Why not reuse skill-creator's eval harness? → It targets skill capability with known trigger-isolation bias (W2 D3 — anthropics/skills#556); style/register checks are out of its scope by its own docs. Complementary, not duplicated.
2. `[failure]` es-ES detect false positives on code blocks? → Graders must strip fenced code + inline code before language/style checks — fixture covers it.

## Commandments cubiertos

| # | Cómo |
|---|---|
| IV | The harness is itself a blocking gate for meta-config changes |
| IX | Operationalizes feedback-measure-dont-estimate + behavioral-AC-next-session lessons |
| II | No LLM judge — deterministic verification only (W2 D4) |

## Verificación post-implementación

- Smoke: `bun .claude/evals/run.ts --offline .claude/evals/__tests__/fixtures` → report prints.
- `bun test ./.claude/evals/ ./.claude/hooks/` green.

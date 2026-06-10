---
us: US1
title: Critic redesign — mechanical checks + ONE fresh-context reviewer; panel demoted to decisions
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: closed
closed: 2026-06-10
absorbs_decision: P1 exception — 1 fresh-context read-only reviewer
---

# US1 — Critic redesign

## Execution prompt (Phase 3 input)

**Task**: Rewrite `critic`'s independent-review model: default code review = runnable mechanical checks (existing Step 4) + ONE fresh-context read-only reviewer constrained to correctness/requirements; remove the ≥4-perspective panel as code-review default, re-pointing panel escalation to DECISION review only (decision-stress-test).
**Context**: `.claude/skills/critic/SKILL.md` (current panel model: description lines 9-11, Step 3 full-level row, Step 7 §Independent review PANEL, SIEMPRE rule "panel ≥4 (Workflow) or inline-with-declared-bias", Edge 4/5, smell signal on panel overuse, anti-pattern row, Commandments VII/VIII rows, output format `review panel` line) + `.claude/skills/critic/references/01-decisions-and-auxiliaries.md` (decision history §Independent review model). Evidence: `.claude/plans/018-evidence-roadmap/decision-memo-W1.md` D1/D3 (verifier gap; deliberative panels weak for code), `decision-memo-W2.md` D1 (deterministic 0% FP vs LLM-judge 80% FP). User ratified complete demotion (no `--panel` opt-in flag for code) 2026-06-10.
**Constraints**: Verdict contract unchanged (APPROVED/APPROVED_WITH_WARNINGS/NEEDS_CHANGES/BLOCKED). `review-patterns` + `security-review` dispatch rules unchanged. The fresh reviewer is ONE read-only Agent (fresh context, never the authoring session), prompted ONLY on: spec.md AC trace, correctness of the diff, requirements coverage — explicitly NOT style/perf/maintainability (those stay in the critic's inline checklist). Every removed/retained mechanism cites its evidence inline (spec AC2). Frontmatter `review_panel_invoked` → `fresh_reviewer_invoked: <yes|no (inline + declared bias)>`. English only. Do NOT touch files outside `.claude/skills/critic/`.
**Deliverable**: Edited `.claude/skills/critic/SKILL.md` + `.claude/skills/critic/references/01-decisions-and-auxiliaries.md` (new decision row: feature 019, panel → decision-review-only, fresh-reviewer rationale + P1 exception).
**Verify**: `grep -n "panel" .claude/skills/critic/` → remaining mentions ONLY in decision-history/demotion context, none as live code-review default; `grep -n "fresh" .claude/skills/critic/SKILL.md` → reviewer present in Step 7 + output format; `bun test ./.claude/hooks/` green.
**Ask first**: nothing — decisions locked at gate-entry ratification.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | [US2] |
| **Files touched** | `.claude/skills/critic/SKILL.md`, `.claude/skills/critic/references/01-decisions-and-auxiliaries.md` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Read both critic files end-to-end; list every panel-as-default site before editing |
| **Decisión absorbida** | P1 exception: ONE fresh-context read-only reviewer is the evidence-backed code-review form |

## User story

- **As a**: Oriol closing Phase 4 on any feature
- **I want**: the critic to run the evidence-strong review form by default (mechanical checks + one fresh reviewer)
- **So that**: verdicts cost less and carry fewer false positives than deliberative panels (~80% FP measured)

## Acceptance criteria

- **AC1**: Given a feature entering Phase 4 at standard/full level, when `critic` runs on code, then Step 7 dispatches exactly ONE fresh-context read-only reviewer (correctness/requirements only) and NO ≥4 panel fires by default. (spec AC1)
- **AC2**: Given the redesigned SKILL.md, when read, then every removed/retained mechanism cites W1 D1/D3 or W2 D1, and panel escalation appears only as a pointer to decision review (decision-stress-test). (spec AC1+AC2)
- **AC3**: Given the references file, when read, then the decision history records feature 019's demotion + the P1 exception with rationale.
- **AC4**: Given `/flow` Phase 4 wiring, when critic closes, then the verdict contract and report shape remain parseable (verdict values unchanged).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/critic/SKILL.md` | description, Step 3 (full row), Step 7 (reviewer model), SIEMPRE rule, Edge 4/5, smell, anti-pattern, Cmd VII/VIII rows, frontmatter field, output format |
| `.claude/skills/critic/references/01-decisions-and-auxiliaries.md` | New decision row (019) + verification list update |

## Workflow detallado

1. Read both files end-to-end; inventory every panel-as-default site (description, Step 3, Step 7, SIEMPRE, edges, smells, anti-patterns, output).
2. Draft the fresh-reviewer Step 7 block: trigger (standard+ on code; always when author=evaluator), mechanism (ONE read-only Agent, fresh context), constraint (correctness/requirements only), fallback (no agent available → inline + declared bias, unchanged).
3. Apply edits; re-point panel mentions to decision-stress-test (decisions only).
4. Update references/01 decision history.
5. Run Verify block.

## Drillme (Socratic check)

1. `[location]` Does the P1-exception wording belong here or in orchestrator-protocol? → Decision is TAKEN here (absorbs_decision); canonical doctrine wording propagates in US2.
2. `[approach]` Why ONE reviewer and not zero (checks only)? → Verifier gap covers mechanical checks' blind spot: requirements coverage needs reading the spec, which no runnable check does (W1 D3).
3. `[context]` What breaks downstream if frontmatter field renames? → review.template.md and flow.md mention `review_panel_invoked`? Verify with grep at build; patch template if needed (within scope — template is critic's output contract).
4. `[failure]` Critic reviewing its own session's work with the panel gone? → Fresh-context reviewer IS the independence mechanism; inline-with-declared-bias stays as the no-agent fallback.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Every design choice cites 018 evidence inline |
| IV | Verdict contract preserved — gate keeps blocking |
| VII | Panel cost removed from the default path |

## Verificación post-implementación

- Smoke: grep checks from Verify block.
- `bun test ./.claude/hooks/` sigue green.

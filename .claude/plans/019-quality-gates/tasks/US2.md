---
us: US2
title: Propagate review doctrine — orchestrator-protocol, flow.md, system-inventory
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: S
status: closed
closed: 2026-06-10
---

# US2 — Ecosystem doctrine update

## Execution prompt (Phase 3 input)

**Task**: Propagate US1's review doctrine (mechanical checks + ONE fresh-context reviewer = code-review default; panel ≥4 = decision review only; P1 gains the fresh-reviewer exception) to every doctrine site outside the critic skill.
**Context**: Grep-verified sites (2026-06-10): `.claude/skills/orchestrator-protocol/SKILL.md` lines ~82 (decision-tree node "panel review ≥4"), ~91 (P4 rule), ~130 (Workflow row), ~145 (multi-file review row); `.claude/skills/orchestrator-protocol/references/04-agent-selection.md` lines ~65, ~94, ~98 (§Workflow wiring — critic's dispatch target); `.claude/commands/flow.md` (Phase 4 description + full-mode adaptation table "independent review panel (≥4 via Workflow)"); `.claude/docs/system-inventory.md` lines ~46, ~69. Read US1's final wording first — it is canonical.
**Constraints**: Panel ≥4 remains VALID for decision review (decision-stress-test) and read-only research fan-out — do not delete the pattern, re-scope it. P1 wording: "1 agent forbidden, EXCEPT the fresh-context code reviewer (critic Phase 4, read-only, evidence W1 D1/D3)". Line numbers are approximate — re-grep before editing (linter may have shifted content). English only.
**Deliverable**: 4 edited files (orchestrator-protocol SKILL.md + references/04, flow.md, system-inventory.md).
**Verify**: `grep -rn "panel" .claude/skills/orchestrator-protocol/ .claude/commands/flow.md .claude/docs/system-inventory.md` → every hit is decision-review or research-fan-out scoped, none says panel is the code-review escalation; `bun test ./.claude/hooks/` green.
**Ask first**: nothing — doctrine locked by US1.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | none |
| **Files touched** | `orchestrator-protocol/SKILL.md`, `orchestrator-protocol/references/04-agent-selection.md`, `commands/flow.md`, `docs/system-inventory.md` |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | Re-grep "panel" across the 4 files; diff against US1's final wording |
| **Decisión absorbida** | — |

## User story

- **As a**: the Lead following orchestration doctrine in any session
- **I want**: every always-loaded/protocol reference to agree on the review model
- **So that**: no stale rule re-launches expensive panels for code review (Commandment X — the system doesn't rot)

## Acceptance criteria

- **AC1**: Given the 4 files post-edit, when grepping "panel", then zero hits describe panel as code-review default/escalation; decision-review and research fan-out usages remain.
- **AC2**: Given orchestrator-protocol P1/P4, when read, then the fresh-reviewer exception is stated with its evidence citation.
- **AC3**: Given flow.md full-mode row, when read, then Phase 4 describes checks + fresh reviewer (panel only via decision-stress-test for decisions).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/orchestrator-protocol/SKILL.md` | Decision-tree node, P4 rule, Workflow row, review row |
| `.claude/skills/orchestrator-protocol/references/04-agent-selection.md` | §Workflow wiring review rows (3 sites) |
| `.claude/commands/flow.md` | Phase 4 + adaptation table full row |
| `.claude/docs/system-inventory.md` | Workflow fan-out row + full-mode row |

## Workflow detallado

1. Read US1's final critic wording (canonical).
2. Re-grep "panel" in the 4 targets; edit each site.
3. Run Verify block.

## Smell signals

- ⚠️ A fifth file surfaces in the re-grep → blast radius was under-counted; add it here, do not silently expand elsewhere.

## Commandments cubiertos

| # | Cómo |
|---|---|
| X | No contradictory rules across always-loaded + protocol layers |
| II | Re-grep before edit — no stale line numbers trusted |

## Verificación post-implementación

- Smoke: Verify-block greps.
- `bun test ./.claude/hooks/` sigue green.

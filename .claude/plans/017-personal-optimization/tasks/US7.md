---
us: US7
title: Truth sweep — remaining phantom refs, dead globs, version citations
wave: W2
depends_on: []
tdd_mode: skip: doc-only change, no testable behavior
estimate: S
status: draft
---

# US7 — Barrido de verdad restante

## Execution prompt (Phase 3 input)

**Task**: Truth-fix 4 files: (1) `test-policy.md` "honored by builder" → `build` skill; (2) `rules/paths/orchestration.md` remove dead glob `.claude/agents/**`; (3) `docs/arch-h-lead-directed-skill-reads.md` past-tense all agent-era statements + propagate the external-examples correction (django/binora) to EVERY scattered mention (lines ~27, 91-92, 142, 160-164, 183) + cite CC 2.1.133; (4) `flow.md` add citations to version claims (GA 2.1.154, trigger 2.1.160) and align the ≥4-HU Workflow paragraph with the US1 doctrine (write fan-out = explicit opt-in only).
**Context**: Audit 2026-06-10 located every instance. Files are disjoint from US1 (orchestrator-protocol) and US2 (CLAUDE.md, error-recovery).
**Constraints**: Historical mentions stay (past tense + disclaimer); only LIVE instructions pointing at dead things get rewritten. English. Citations point to changelog or `_research-skill-activation-2026-06-09.md`.
**Deliverable**: 4 files fixed.
**Verify**: `grep -rn "\.claude/agents" .claude/rules/` → 0; `grep -n "builder" .claude/rules/test-policy.md` → 0 live; every version pin in flow.md carries a source.
**Ask first**: nothing — decisions locked.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | none (files disjoint from US1/US2) |
| **Blocks** | none |
| **Files touched** | `.claude/rules/test-policy.md`, `.claude/rules/paths/orchestration.md`, `.claude/docs/arch-h-lead-directed-skill-reads.md`, `.claude/commands/flow.md` |
| **TDD-mode** | skip: doc-only change, no testable behavior |
| **Estimate** | S |
| **Cómo arrancar** | Per file: grep `builder\|reviewer\|scout\|planner-protocol\|\.claude/agents` + version pins; fix in place |
| **Decisión absorbida** | — |

## User story

- **As a**: Oriol
- **I want**: zero live instructions pointing at dead components and every version claim cited
- **So that**: the system's self-documentation is trustworthy (Commandment II applied to ourselves)

## Acceptance criteria

- **AC1**: Given test-policy.md, when reading, then "honored by builder per node" → references the `build` skill. (audit DRIFT)
- **AC2**: Given paths/orchestration.md, when reading globs, then `.claude/agents/**` is removed (no agents dir exists).
- **AC3**: Given docs/arch-h-*.md, when reading, then agent-era statements are past-tense with the 2026-06-10 correction propagated to ALL scattered django/binora examples (marked external), and the CC 2.1.133 claim cites `_research-skill-activation-2026-06-09.md`.
- **AC4**: Given flow.md, when reading version claims (GA 2.1.154, trigger change 2.1.160), then each carries a citation and hedging consistent with CLAUDE.md (post-US2 wording); the ≥4-HU Workflow paragraph aligns with the US1 doctrine (write-work fan-out = explicit opt-in only).

## Workflow detallado

1. Grep the 4 files for the phantom-pattern list + version pins.
2. Fix in place: live-instruction refs → current component; historical mentions → past tense + disclaimer.
3. Citations: link changelog or the in-repo _research file per pin.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Cada afirmación citada o corregida |
| X | El meta-sistema deja de pudrirse |

## Verificación post-implementación

- `grep -rn "\.claude/agents" .claude/rules/` → 0.
- `grep -n "builder" .claude/rules/test-policy.md` → 0 vivos.

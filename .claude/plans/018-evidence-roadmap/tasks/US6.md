---
us: US6
title: W6 Synthesis — roadmap-019.md + decision↔evidence table
wave: W-B
depends_on: [US1, US2, US3, US4, US5]
tdd_mode: optional
estimate: M
status: draft
absorbs_decision: synthesis runs inline with zero agents (share-context principle)
---

# US6 — W6 Synthesis

## Execution prompt (Phase 3 input)

**Task**: Cross the five decision-memos into `roadmap-019.md` — the prioritized, evidence-cited backlog for post-017 poneglyph — plus a consolidated decision↔evidence table.
**Context**: Inputs: `decision-memo-W{1..5}.md` + `evidence/` corpus + spec rigor method. Priority axis (user maxim, 2026-06-10): **impact on delivered code quality first**, then context hygiene, then platform robustness, then speed/cost. Known cross-WS tensions to resolve explicitly: panels-vs-mechanical-verification (seed verdicts already favor mechanical + 1 fresh reviewer; panels only for decisions), parallelism-for-speed vs review-bottleneck (METR warning).
**Constraints**: INLINE, zero agents — synthesis needs full cross-memo context (Cognition share-context principle; an agent would synthesize from summaries of summaries). Every backlog entry: title · what it changes · evidence refs (≥1 A/B) · Commandments served · effort S/M/L · suggested feature grouping (019, 020…). Conflicts between memos surface in a "Tensions" section with a recommendation, never silently resolved. If a W-A memo is missing (US deferred/failed), synthesize what exists and list the gap. English.
**Deliverable**: `roadmap-019.md` (at plan root) + decision↔evidence table inside it.
**Verify**: spec AC4 — every entry cites ≥1 A/B finding; user ratifies in retro (Phase 5).
**Ask first**: priority calls between two same-tier backlog entries with comparable evidence → AskUserQuestion rather than inventing preference.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W-B |
| **Depends on** | [US1, US2, US3, US4, US5] |
| **Blocks** | none (closes Phase 3) |
| **Files touched** | `roadmap-019.md` |
| **TDD-mode** | optional (validation-mode) |
| **Estimate** | M |
| **Cómo arrancar** | Read the 5 memos + skim evidence/; draft backlog grouped by feature; resolve tensions explicitly |

## User story

- **As a**: the user deciding what poneglyph builds next
- **I want**: one prioritized backlog where every entry shows its evidence
- **So that**: 019+ is committed on facts, ratified by me, with quality-of-code impact leading

## Acceptance criteria

- **AC1** (spec AC4): `roadmap-019.md` exists; every entry references ≥1 Tier A/B finding from `evidence/`.
- **AC2**: a Tensions section resolves (or surfaces for the user) every cross-memo conflict found.
- **AC3**: priority ordering follows the quality-first axis; deviations justified inline.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `roadmap-019.md` | Prioritized backlog + decision↔evidence table + Tensions section |

## Smell signals

- ⚠️ A backlog entry without an evidence ref → it's an opinion; move it to a clearly-labeled "Unbacked ideas" footer or drop it.
- ⚠️ Synthesis delegated to an agent → violates the absorbed decision; run inline.

## Verificación post-implementación

- Smoke: `grep -c 'seed-\|W[1-5]' roadmap-019.md` > 10 (entries actually cite the corpus).

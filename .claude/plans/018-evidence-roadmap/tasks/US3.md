---
us: US3
title: W3 Context measured — degradation data and mitigation-policy comparisons
wave: W-A
depends_on: []
tdd_mode: optional
estimate: M
status: closed
closed: 2026-06-10
absorbs_decision: flag model-era transferability on every benchmark claim
---

# US3 — W3 Context measured

## Execution prompt (Phase 3 input)

**Task**: Produce `evidence/W3.md` + `decision-memo-W3.md` quantifying context degradation and comparing mitigation policies, Tier A/B.
**Context**: User confirms clear long-session degradation (2026-06-10). Seed ground: Anthropic "context window is THE constraint" + subagent compression ratios (tens of thousands → 1-2k tokens) + technique-selection rule (compaction / note-taking / multi-agent) in `evidence/seed-anthropic.md`. The "40% utilization rule" exists only as practitioner anecdote (Fuller, seed-industry). Rigor method in `spec.md`.
**Constraints**: ≤5 agents (4 finders + 1 refuter — cap raised by gate-2→3 REFINE: graphify angle added). Finder angles: (a) benchmarks quantifying performance vs context length (RULER, NoLiMa, LongBench v2, Fiction.liveBench, Chroma context-rot report, needle-variants) — extract degradation curves/thresholds AND the model generation tested; **every claim must flag model era** (most predate Fable-5-class models — if no recent data exists, say so, never extrapolate silently); (b) measured comparisons of mitigation policies — compaction vs note-taking/memory-files vs subagent compression (Anthropic context engineering, Letta/MemGPT paper numbers, JetBrains/Cognition compressor reports, SWE-bench long-horizon studies); (c) provenance and any validation of practical utilization thresholds (the 40% rule, Anthropic guidance, vendor auto-compact trigger points and their rationale); (d) **code-graph/repo-map context layer** — extend `evidence/seed-graphify.md` (scout, 2026-06-10): close its open gap (marginal value of graph-over-LSP — any measured comparison), category evidence beyond the seed (RepoGraph/CodexGraph applicability to interactive sessions, Aider repo-map design data), and graphify issue #580 resolution status. Tier+URL+date per claim; UNVERIFIED explicit; counter-evidence mandatory (e.g., studies where long context did NOT degrade, or where compaction hurt).
**Deliverable**: `evidence/W3.md` + `decision-memo-W3.md`: Lead context policy constraints (when to delegate reads to Explore, when to compact, utilization threshold IF the data supports one — otherwise the memo states "no defensible threshold; use qualitative triggers"), each ↔ A/B finding with model-era caveat. Memo MUST include a graphify verdict: adopt-with-A/B-pilot / watchlist / discard — with the decisive test being the seed's proposed 1-hour A/B on a user repo (per `feedback-measure-dont-estimate`).
**Verify**: validations.md checklist for W3 (adds: model-era flag present on every benchmark claim).
**Ask first**: nothing — decisions locked.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W-A |
| **Depends on** | none |
| **Blocks** | [US6] |
| **Files touched** | `evidence/W3.md`, `decision-memo-W3.md` |
| **TDD-mode** | optional (validation-mode) |
| **Estimate** | M |
| **Cómo arrancar** | Spawn 3 finders (angles a/b/c); refuter; write artefacts |

## User story

- **As a**: poneglyph Lead running long sessions
- **I want**: quantified degradation data and policy comparisons
- **So that**: the context policy (delegate-reads threshold, compaction trigger) rests on numbers, not vibes

## Acceptance criteria

- **AC1** (spec AC1): rigor format + counter-evidence + refuter log in `evidence/W3.md`.
- **AC2** (spec AC2): both artefacts exist.
- **AC3** (spec AC1, US-specific): every benchmark claim carries a model-era flag; absent recent data → explicit "no Fable-5-era measurement found" statement instead of extrapolation.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `evidence/W3.md` | Degradation curves, policy comparisons, threshold provenance, counter-evidence |
| `decision-memo-W3.md` | Context policy constraints ↔ evidence |

## Smell signals

- ⚠️ Memo proposes a numeric threshold without an A/B source → exactly the conjecture this feature exists to kill.

## Verificación post-implementación

- Smoke: both files exist; `grep -i 'model era\|model generation\|tested on' evidence/W3.md` non-empty.

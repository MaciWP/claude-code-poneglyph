---
us: US1
title: W1 Orchestration II — best-of-N verified, background-session data, effort heuristics
wave: W-A
depends_on: [US0]
tdd_mode: optional
estimate: M
status: draft
absorbs_decision: METR-lite protocol is a proposal only; any implementation is 019+
---

# US1 — W1 Orchestration II

## Execution prompt (Phase 3 input)

**Task**: Produce `evidence/W1.md` + `decision-memo-W1.md` answering W1's research questions with Tier A/B evidence, extending (never repeating) the three seed dossiers.
**Context**: Seeds at `evidence/seed-{anthropic,academic,industry}.md` are verified ground — their coverage: Anthropic 90.2%/15×-tokens/coding-excluded; verifier gap (Monkeys, AlphaCode, OpenHands, Augment, DEI); MAST/debate counter-evidence; bg-session products landscape (Codex/Cursor/Copilot/Devin/Jules) + METR RCT; worktree practitioner ceiling 2-8. Rigor method in `spec.md` §Modelo conceptual.
**Constraints**: ≤4 agents (3 finders + 1 refuter). Finder angles: (a) best-of-N + mechanical-verifier patterns shipped in INTERACTIVE products/harnesses (not benchmark pipelines) — mechanics + real cost data; (b) background-session outcome data NOT vendor-published (independent trackers, enterprise studies, academic measurements 2025-26: merge rate, rework rate, review load) + published self-measurement protocols for solo devs (METR-lite shapes); (c) effort-scaling/delegation heuristics in published orchestrator prompts/architectures (Anthropic research system, OpenHands, Manus, others with public detail). Every claim: tier + URL + date; UNVERIFIED explicit; counter-evidence section mandatory. English, in-repo.
**Deliverable**: `evidence/W1.md` (findings per angle + counter-evidence + verdict) and `decision-memo-W1.md` (each design implication ↔ supporting A/B finding): best-of-N mode design constraints, bg-sessions pilot shape + measurement protocol PROPOSAL, concrete heuristic numbers for `orchestrator-protocol`.
**Verify**: validations.md checklist for W1 (tiers present, URLs cited, refuter pass ran on decision-changing claims, counter-evidence section non-empty, no C/D grounding a memo decision).
**Ask first**: nothing — decisions locked at gates.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W-A |
| **Depends on** | [US0] |
| **Blocks** | [US6] |
| **Files touched** | `evidence/W1.md`, `decision-memo-W1.md` |
| **TDD-mode** | optional (validation-mode) |
| **Estimate** | M |
| **Cómo arrancar** | Spawn 3 finder agents (angles a/b/c above) in one message; refuter pass on their decision-changing claims; write both artefacts |

## User story

- **As a**: poneglyph maintainer designing post-017 orchestration
- **I want**: measured evidence on best-of-N, background sessions and effort heuristics
- **So that**: the 019+ orchestration features are grounded in A/B data, not in the enthusiasm cycle that produced the failed agent doctrine

## Acceptance criteria

- **AC1** (traces spec AC1): Given `evidence/W1.md`, when audited, then every decision-changing claim carries tier+URL+date, counter-evidence section exists, no C/D grounds a memo decision.
- **AC2** (traces spec AC2): Given Phase 3, when US1 closes, then both artefacts exist and the refuter pass is documented inside `evidence/W1.md` (claims checked + outcomes).
- **AC3** (traces spec AC1/AC4): Given `decision-memo-W1.md`, when read, then METR-lite appears as proposal only (no implementation steps) and each implication cites ≥1 A/B finding.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `evidence/W1.md` | Findings per angle, counter-evidence, refuter log, verdict |
| `decision-memo-W1.md` | Design implications ↔ evidence table |

## Smell signals

- ⚠️ Finder returns only the seed sources again → prompt violated "extend, don't repeat"; re-issue with explicit exclusion list.
- ⚠️ >4 agents spawned → cap breached; stop and consolidate.

## Verificación post-implementación

- Smoke: both files exist; `grep -c 'http' evidence/W1.md` > 10; counter-evidence heading present.

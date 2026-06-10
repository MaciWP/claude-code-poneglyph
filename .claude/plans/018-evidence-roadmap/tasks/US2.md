---
us: US2
title: W2 Behavioral evals — measured practice for prompt/config regression testing
wave: W-A
depends_on: []
tdd_mode: optional
estimate: M
status: draft
absorbs_decision: harness design constraints only; implementation is 019+
---

# US2 — W2 Behavioral evals

## Execution prompt (Phase 3 input)

**Task**: Produce `evidence/W2.md` + `decision-memo-W2.md` on how serious projects regression-test prompts/system-config, with Tier A/B evidence.
**Context**: poneglyph changes CLAUDE.md/output-style/skills and validates "by feel next session" (known lesson `feedback-behavioral-ac-next-session`). 017 excluded observability; this is regression-testing of config, not telemetry. Seed-relevant ground: Anthropic eval lessons (judge end state not process; single-call 0.0-1.0 judge most consistent; start ~20 cases; rules-based feedback > LLM-judge) in `evidence/seed-anthropic.md`. Rigor method in `spec.md`.
**Constraints**: ≤4 agents (3 finders + 1 refuter). Finder angles: (a) prompt/config regression tools with documented methodology and any usage/accuracy data (promptfoo, Braintrust, LangSmith evals, OpenAI evals, DSPy asserts) — what they measure, minimum set sizes, grading methods; (b) the installed `skill-creator` plugin's eval harness: exact mechanics (how it scores triggering/variance) from official docs/repo — this is directly actionable; (c) published cases measuring system-prompt/CLAUDE.md/skill-trigger regressions specifically for coding agents (community harnesses, papers on prompt regression, agentic config evals). Every claim: tier + URL + date; UNVERIFIED explicit; counter-evidence mandatory (e.g., eval-overfitting findings, flaky-judge data). English.
**Deliverable**: `evidence/W2.md` + `decision-memo-W2.md`: golden-prompt harness design constraints for poneglyph (set size, grading hierarchy, what to eval: skill triggering / es-ES register / confidence labels / BLUF), each constraint ↔ A/B finding.
**Verify**: validations.md checklist for W2.
**Ask first**: nothing — decisions locked.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W-A |
| **Depends on** | none |
| **Blocks** | [US6] |
| **Files touched** | `evidence/W2.md`, `decision-memo-W2.md` |
| **TDD-mode** | optional (validation-mode) |
| **Estimate** | M |
| **Cómo arrancar** | Spawn 3 finders (angles a/b/c); refuter on decision-changing claims; write artefacts |

## User story

- **As a**: poneglyph maintainer changing behavioral config
- **I want**: measured methods to detect config regressions before they cost sessions
- **So that**: "validate next session by feel" becomes a repeatable check (Commandments IV + IX)

## Acceptance criteria

- **AC1** (spec AC1): rigor format holds across `evidence/W2.md`; counter-evidence present.
- **AC2** (spec AC2): both artefacts exist; refuter log included.
- **AC3** (spec AC4): every harness constraint in the memo cites ≥1 A/B finding; implementation steps absent (019+).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `evidence/W2.md` | Findings per angle, counter-evidence, refuter log, verdict |
| `decision-memo-W2.md` | Harness design constraints ↔ evidence |

## Smell signals

- ⚠️ Memo prescribes a specific tool install/config → implementation creep; constraints only.

## Verificación post-implementación

- Smoke: both files exist; counter-evidence heading present; skill-creator eval mechanics section present (angle b is mandatory — it ships installed).

---
spec: 004-report-visual-taste
phase: 2.5
mode: validation-mode
reason: all HUs produce markdown (references/SKILL.md), no executable business logic — test-policy auxiliary → validation-mode (not TDD red→green). Exception: if US4 adds a `.ts` contrast helper, that node switches to tests.md (red→green).
created: 2026-05-29
---

# Phase 2.5 — Validation oracle (validation-mode)

These HUs deliver **markdown content**, not code. The oracle is **inspection against explicit criteria**, not executable assertions. Each HU below lists its validation checks (binary). Phase 4 `critic` runs the cross-cutting validations (esp. Cmd X no-duplication, the real risk).

## US1 — taste-hard-rules.md

| # | Validation | Pass condition |
|---|---|---|
| V1.1 | Domains covered | spacing + typography + color + depth + motion + WCAG all present |
| V1.2 | Sourced | every rule cites an authority (Refactoring UI / Rauno / Comeau / Emil / MD3 / WCAG) |
| V1.3 | Actionable | each rule is checkable (a value/threshold), HARD vs TASTE labelled |
| V1.4 | No restatement | no rule duplicates SKILL.md's existing doctrine (no-purple/deep-teal/serif) |

## US2 — anti-slop.md

| # | Validation | Pass condition |
|---|---|---|
| V2.1 | Absolute Bans present | unconditional list incl. purple→blue, Inter-default, cards-in-cards, em-dashes, bounce easing, icon-tile-above-heading, untinted greys, gray-on-color, centered-all |
| V2.2 | Tells catalog | each tell has `why` + `use-instead` |
| V2.3 | Root-cause note | training-median / `bg-indigo-500` cascade cited |
| V2.4 | Canonical home | overlap with SKILL.md flagged for US5 to point here (no dual source) |

## US3 — pre-flight-checklist.md

| # | Validation | Pass condition |
|---|---|---|
| V3.1 | Size | 15-25 items (lean, not 80) |
| V3.2 | Binary | every item is pass/fail checkable |
| V3.3 | Coverage | typography, color/contrast, spacing, motion+reduced-motion, anti-slop, a11y, print, dark/light |
| V3.4 | Gate framing | "any failed item → not done" stated |
| V3.5 | Traceability | items trace to US1/US2 (no novel rules) |

## US4 — critique-mode.md (+ optional helper)

| # | Validation | Pass condition |
|---|---|---|
| V4.1 | Dimensions | critique covers ≥ typography/color/layout/motion/a11y |
| V4.2 | Severity | findings carry BLOCKER/MAJOR/MINOR/NIT + cite violated rule |
| V4.3 | Checklist eval | emits pass/fail vs US3 |
| V4.4 | Cmd III | markdown-mode default; helper `.ts` only if justified → THEN red→green test required (switches to tests.md for that node) |
| V4.5 | Smoke | run on a sample HTML with planted tells → reports them |

## US5 — SKILL.md integration

| # | Validation | Pass condition |
|---|---|---|
| V5.1 | Wiring | workflow references the 4 new references at correct steps |
| V5.2 | De-dup | inline anti-generic table replaced by pointer to anti-slop.md (Cmd X) |
| V5.3 | Size | SKILL.md <500 lines |
| V5.4 | Activation | description surfaces critique/audit (triggers on "critica este HTML"/"audita el diseño") |
| V5.5 | Charter | strict charter intact (renders CC's own outputs; not general UI gen) |

## Cross-cutting (Phase 4 critic owns these)

| # | Validation | Owner |
|---|---|---|
| X1 | Cmd X — zero duplication vs frontend-design + existing SKILL.md doctrine (AC8) | critic |
| X2 | `bun test ./.claude/hooks/` 81/81 (no hook impact; +1 if US4 helper added) | Lead post-build |
| X3 | Real smoke: critique mode flags tells in an actual html-report render | critic |

> Build method (Phase 3): Wave 1 = 3 independent doc HUs → **Lead inline** (≤3 units, regla ≥4 → no agent spawn). US4/US5 sequential → Lead inline. No workflow needed at this scale.

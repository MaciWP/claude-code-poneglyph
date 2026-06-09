---
us: US3
title: Pre-flight checklist gate
wave: 1
depends_on: []
tdd_mode: optional
estimate: 0.5 session
status: closed
---

| Campo | Valor |
|---|---|
| HU | US3 |
| Title | Pre-flight checklist gate |
| Wave | 1 |
| Type | 🔵 independent |
| Depends on | — |
| TDD-mode | optional (markdown doc) |
| Estimate | 0.5 session |
| Status | draft |
| Files | 1 (`html-report/references/pre-flight-checklist.md`) |

# User story

As **html-report**, I want a **pre-flight checklist** applied before declaring a render done, so that quality is gated ("if any item fails, not done") — the framing that makes taste-skill's checklist effective.

# Acceptance criteria

- **AC1**: Given the hard rules + bans, when the checklist is written, then it is a **~15-25 item actionable gate** covering: typography discipline, color/contrast (WCAG), spacing rhythm, motion motivation + reduced-motion, anti-slop tells absent, accessibility (role/aria, label-not-color), print + dark/light.
- **AC2**: Given each item, when read, then it is **binary-checkable** (pass/fail), not vague.
- **AC3**: Given the framing, when written, then it states the gate semantics: any failed item → output not done.
- **AC4**: Given consistency, when written, then items trace to US1 (hard rules) / US2 (bans) — no novel rules introduced here (authored from the same dossier source).

# Files

| Action | Path |
|---|---|
| create | `.claude/skills/html-report/references/pre-flight-checklist.md` |

# Workflow

1. Derive checklist items from the dossier (taste-skill Pre-Flight pattern, leaner ~15-25).
2. Phrase each as a binary check.
3. Add gate-semantics header.

# Commandments

III (lean checklist, not 80-item bloat), IV (gate semantics), X (no novel rules, traces to US1/US2).

# Verificación

- File exists; 15-25 binary items; gate framing present. Tests 81/81.

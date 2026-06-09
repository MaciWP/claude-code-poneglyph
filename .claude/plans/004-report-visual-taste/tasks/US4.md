---
us: US4
title: Critique/audit mode
wave: 2
depends_on: [US1, US2, US3]
tdd_mode: optional
estimate: 0.5 session
status: closed
---

| Campo | Valor |
|---|---|
| HU | US4 |
| Title | Critique/audit mode |
| Wave | 2 |
| Type | 🟡 dependent |
| Depends on | US1, US2, US3 |
| TDD-mode | optional (markdown-mode; if a `.ts` helper is added → that node `tdd: forced`) |
| Estimate | 0.5 session |
| Status | draft |
| Files | 1-2 (`html-report/references/critique-mode.md` [+ optional helper]) |

# User story

As a user, I want html-report to have a **critique/audit mode** that, given an HTML/CSS (or its own render), reports taste violations + AI-slop tells with severity — the capability neither html-report nor builtin `frontend-design` currently has (the real gap).

# Acceptance criteria

- **AC1**: Given an HTML/CSS input with known tells, when critique mode runs, then it reports violations covering **≥ typography / color / layout / motion / a11y**, each citing the violated rule (from US1/US2) + a severity (BLOCKER/MAJOR/MINOR/NIT, reusing critic's severity vocabulary).
- **AC2**: Given the pre-flight checklist (US3), when critique runs, then it evaluates against it and emits a pass/fail summary.
- **AC3**: Given Cmd III, when designed, then the mode is **markdown-driven** (the model audits guided by the references) — NO JS framework. A deterministic helper (`.ts`) is OPTIONAL and only if it adds value (e.g. contrast-ratio math); if added, it gets a paired test (`tdd: forced` on that node).
- **AC4**: Given invocation, when documented, then it is reachable (a `critique`/`audit` mode of html-report, OQ3 resolved at build — section in SKILL.md vs distinct verb).

# Files

| Action | Path |
|---|---|
| create | `.claude/skills/html-report/references/critique-mode.md` |
| create (optional) | `.claude/skills/html-report/scripts/contrast-check.ts` (+ test) — only if deterministic check justified |

# Workflow

1. Define the critique output format (finding: `dimension · rule · severity · location · fix`).
2. Wire it to consume US1 (rules), US2 (bans), US3 (checklist).
3. Decide OQ3 (markdown-mode default per Cmd III).
4. If a contrast helper is added → write it + a test (red→green), update tdd_mode for that node.

# Drillme (US justifies it — new capability)

1. `[approach]` Simpler? Markdown-mode vs helper — default to markdown (Cmd III).
2. `[context]` Reinventing? `critic` skill reviews code, not rendered HTML — no overlap; this audits visual output.
3. `[failure]` If critique misses a tell, does it fail safe? (reports what it finds; checklist catches the rest).

# Commandments

III (markdown-mode, no JS unless justified), IV (severity + pass/fail gate), VIII (reuses critic's severity vocabulary), X (fills a real gap, no duplication).

# Verificación

- Critique mode documented; runs on a sample with tells → reports violations w/ severity. If helper added → its test passes. Tests 81/81 (+ new test if helper).

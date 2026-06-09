---
us: US5
title: Integrate corpus into html-report SKILL.md
wave: 3
depends_on: [US1, US2, US3, US4]
tdd_mode: optional
estimate: 0.5 session
status: closed
---

| Campo | Valor |
|---|---|
| HU | US5 |
| Title | Integrate corpus into html-report SKILL.md |
| Wave | 3 |
| Type | 🟡 dependent |
| Depends on | US1, US2, US3, US4 |
| TDD-mode | optional (markdown) |
| Estimate | 0.5 session |
| Status | draft |
| Files | 1 (`html-report/SKILL.md`) |

# User story

As **html-report**, I want my `SKILL.md` to consume the new taste corpus + critique mode (not improvise), while staying lean (<500 lines), so the visual layer reliably applies expert taste.

# Acceptance criteria

- **AC1**: Given the new references, when SKILL.md is updated, then its workflow **references** `references/{taste-hard-rules, anti-slop, pre-flight-checklist, critique-mode}.md` at the right steps (taste applied during generation; pre-flight before write; critique available as a mode).
- **AC2**: Given the existing "anti-generic" table in SKILL.md, when integrated, then duplicated content is **replaced by a pointer** to `references/anti-slop.md` (single source — Cmd X), not kept in two places.
- **AC3**: Given the size budget, when measured, then `SKILL.md` is **<500 lines** (finding A7); detail lives in references/.
- **AC4**: Given `description` frontmatter, when reviewed, then it still auto-activates correctly (mention critique/audit capability so it triggers on "critica este HTML"/"audita el diseño") — aligns with the skill-activation principle (feature 005).
- **AC5**: Given the charter, when reviewed, then SKILL.md keeps the strict charter (renders Claude Code's own outputs; not general UI gen).

# Files

| Action | Path |
|---|---|
| modify | `.claude/skills/html-report/SKILL.md` |

# Workflow

1. Add references-consumption to the workflow steps (Step 3 frontend-design → new taste step → pre-flight before write).
2. Replace duplicated anti-generic wording with a pointer to `anti-slop.md` (AC2).
3. Document the critique mode (US4) invocation.
4. Update `description` to surface critique/audit (AC4).
5. Verify line count <500 (AC3).

# Drillme

1. `[approach]` Lean? Detail pushed to references, SKILL.md stays thin.
2. `[context]` Duplication? anti-slop pointer replaces inline table (AC2).
3. `[location]` Right structure? references/ is the on-demand home.

# Commandments

III (lean SKILL.md), VIII (consumes corpus, no improvisation), X (single source, <500 lines, no rot).

# Verificación

- SKILL.md <500 lines, references wired, no duplicated anti-generic table, description surfaces critique. `bun test ./.claude/hooks/` 81/81.

---
us: US1
title: Taste hard-rules reference
wave: 1
depends_on: []
tdd_mode: optional
estimate: 0.5 session
status: closed
---

| Campo | Valor |
|---|---|
| HU | US1 |
| Title | Taste hard-rules reference |
| Wave | 1 |
| Type | 🔵 independent |
| Depends on | — |
| TDD-mode | optional (markdown doc) |
| Estimate | 0.5 session |
| Status | draft |
| Files | 1 (`html-report/references/taste-hard-rules.md`) |

# User story

As **html-report** (and any visual surface), I want a **single reference of expert-vetted hard design rules** so that generated output meets a measurable quality bar instead of improvising.

# Acceptance criteria

- **AC1**: Given the dossier Part B authorities, when the reference is written, then it encodes hard rules across **spacing / typography / color / depth / motion + WCAG**, each with its source (Refactoring UI, Rauno Freiberg, Josh Comeau, Emil Kowalski, MD3, WCAG).
- **AC2**: Given each rule, when inspected, then it is **actionable/checkable** (e.g. "line length 45-75ch", "WCAG AA 4.5:1 text / 3:1 large+UI", "animate only transform+opacity", "shadow offset ratio 2:1 v:h", "no font weight <400") — distinguishing HARD rules (measurable) from TASTE guidelines.
- **AC3**: Given html-report's existing doctrine, when written, then it does **NOT** restate it (no-purple/deep-teal/serif already in SKILL.md) — only ADDS (Cmd X). 
- **AC4**: Given the file, when measured, then it is a focused reference (loaded on-demand), not dumped into SKILL.md.

# Files

| Action | Path |
|---|---|
| create | `.claude/skills/html-report/references/taste-hard-rules.md` |

# Workflow

1. Pull the spacing/type/color/depth/motion + WCAG heuristics from dossier Part B "Design-taste corpus".
2. Structure by domain; each rule = `rule · value · HARD|TASTE · source`.
3. Cross-check against current `SKILL.md` doctrine to avoid restatement (AC3).
4. Keep concise; it is a lookup reference, not prose.

# Commandments

II (every rule sourced), III (simple lookup, no over-engineering), X (extends, no duplication).

# Verificación

- File exists, rules sourced, no restatement of existing doctrine. `bun test ./.claude/hooks/` still 81/81 (no hook impact).

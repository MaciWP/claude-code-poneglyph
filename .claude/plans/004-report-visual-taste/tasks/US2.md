---
us: US2
title: Anti-slop bans + tells catalog
wave: 1
depends_on: []
tdd_mode: optional
estimate: 0.5 session
status: closed
---

| Campo | Valor |
|---|---|
| HU | US2 |
| Title | Anti-slop bans + tells catalog |
| Wave | 1 |
| Type | 🔵 independent |
| Depends on | — |
| TDD-mode | optional (markdown doc) |
| Estimate | 0.5 session |
| Status | draft |
| Files | 1 (`html-report/references/anti-slop.md`) |

# User story

As **html-report**, I want an **Absolute-Bans list + AI-slop tells catalog** so that output reliably escapes the generic-AI look (the #1 lever per the 3 studied repos: negative vocabulary).

# Acceptance criteria

- **AC1**: Given the dossier slop catalog, when written, then it contains an **Absolute Bans** section (unconditional "never": purple→blue gradients, Inter/Roboto/Arial as default, gray-text-on-colored-bg, cards-in-cards, em-dashes, bounce/elastic easing, rounded icon-tile-above-every-heading, untinted #808080 greys, centered-everything).
- **AC2**: Given the catalog, when inspected, then it lists **AI-slop "tells"** with a one-line why + the correct alternative.
- **AC3**: Given html-report's existing "anti-generic" table, when written, then it **consolidates/extends** it by reference — NOT duplicate wording (Cmd X). If overlap exists, the reference is the canonical source and SKILL.md points to it (resolved in US5).
- **AC4**: Given the root-cause note, when written, then it briefly cites WHY (training-median, Tailwind `bg-indigo-500` cascade) for rationale — sourced.

# Files

| Action | Path |
|---|---|
| create | `.claude/skills/html-report/references/anti-slop.md` |

# Workflow

1. Author Absolute-Bans + tells from dossier Part B ("AI slop catalog" + consensus tells).
2. Each tell: `tell · why · use-instead`.
3. Note the bans already implied by SKILL.md; mark this reference as their canonical home (US5 wires SKILL.md to point here, no duplication).

# Commandments

II (sourced), III (concrete bans, simple), X (canonical home, no duplication).

# Verificación

- File exists; bans + tells present + sourced; overlap with SKILL.md flagged for US5 consolidation. Tests 81/81.

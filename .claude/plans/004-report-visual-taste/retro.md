---
spec: 004-report-visual-taste
phase: 5
review_verdict: APPROVED_WITH_WARNINGS
feature_closed: true
created: 2026-05-29
---

# Retro — 004 report-visual-taste

## What worked

- **Dossier-first**: 14-agent research durable (`_research-skill-evolution-2026-05-29.md`) BEFORE the spec → spec + tech-plan + build were fast because research was done, not re-run. Pattern worth repeating for research-heavy features.
- **OQ1 = enhance in-place (Cmd III)**: avoided a redundant `design-taste` skill. The taste corpus lives as `html-report/references/`; zero duplication with frontend-design or the existing doctrine.
- **≥4 rule validated in practice**: the entire build (5 HUs + 003 render) ran **inline, no agent spawns** — the parallel work per wave was ≤3 units. Confirmed the rule holds for doc/skill features.
- **Real smoke**: rendering 002's report.md → `report.html` (self-contained, deep-teal, no-purple, gauge/sev-bar exact) proved html-report + the new corpus produce non-generic output. Closed both the 004 warning and the 003 verify gap in one artefact.

## What didn't / friction

- **Turn sprawl**: the whole portfolio (audit + research + 004 lifecycle) ran in one very long `/flow` turn. Worked, but a cleaner cadence would checkpoint per phase. Noted for process.
- **Critique mode is markdown-only**: WCAG contrast is estimated, not computed (the one truly-measurable rule). Accepted per Cmd III; revisit if precise auditing is ever needed (`scripts/contrast-check.ts` + test).

## Promotions (pending human approval)

| Candidate | Scope | Rationale |
|---|---|---|
| Taste corpus (`taste-hard-rules.md` + `anti-slop.md`) | project `.claude/` reusable reference | If `decide/memo` or future visual surfaces need the same bar, extract from html-report/references/ to a shared location. NOT now — only html-report consumes it (YAGNI / Cmd III). Revisit when a 2nd consumer appears. |
| "Dossier-first for research-heavy features" | memory (feedback) | Durable research artefact before spec saved re-running 14 agents. Already partially captured via the dossier file itself. |

## Living-spec delta

- None material. OQ1/OQ2/OQ3 resolved toward Cmd III simplest; matches spec intent. No spec.md rewrite needed.

## Commandments audit

| # | Honored? | How |
|---|---|---|
| II | ✅ | every taste rule sourced to a named authority |
| III | ✅ | enhance-in-place, markdown critique, lean checklist — simplest path |
| IV | ✅ | pre-flight gate + critique verdict + Phase 4 critic verdict |
| V | ✅ | dossier (understand) before spec/build |
| VII | ✅ | ≥4 rule respected — all inline, no wasteful spawns |
| VIII | ✅ | consumes frontend-design + corpus, no improvisation |
| X | ✅ | single source for bans (anti-slop.md); no duplication; SKILL.md <500 lines |

## Closure

8/8 ACs met, 2 MINOR warnings (1 cleared by the real render; 1 accepted by design). Verdict APPROVED_WITH_WARNINGS. Feature lifecycle closed.

## Next (separate features)

- **003 close**: the html-report base is now verified (render works). 003's formal critic+retro can close on this evidence.
- **005 skill-activation**: drop Arch H phantom + upgrade descriptions + adopt native `skills:` field. Scoped in dossier Part A. Fast-follow.

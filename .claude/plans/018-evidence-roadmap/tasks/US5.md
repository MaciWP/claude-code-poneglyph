---
us: US5
title: W5 Discovery — capabilities poneglyph lacks entirely (timeboxed)
wave: W-A
depends_on: []
tdd_mode: optional
estimate: M
status: draft
absorbs_decision: inclusion rubric fixed here (Phase 2 resolution of spec open question)
---

# US5 — W5 Discovery

## Execution prompt (Phase 3 input)

**Task**: Produce `evidence/W5.md` + `decision-memo-W5.md` listing capabilities poneglyph lacks entirely, sourced with rigor. **TIMEBOX: exactly 1 fan-out round (≤3 finders) + 1 refuter round — no follow-up rounds regardless of how promising a thread looks; promising-but-unverified goes to the watchlist.**
**Context**: User explicitly asked for "algo nuevo, algo que no tengamos". Current inventory to diff against: 20 skills (no skill-advisor on this branch), 4 hooks, 5 commands, 0 custom agents, plugins {typescript-lsp, skill-creator, frontend-design, context7}, no evals, no cron routines, no background sessions, no CI. Rigor method in `spec.md`.
**Inclusion rubric (locked)**: a source qualifies if (1) public primary artefacts (repo/config/post with reproducible specifics), (2) reported outcomes — numbers preferred, (3) maintained/active within ~6 months, (4) applicable to a single-user Claude Code context. A capability becomes a CANDIDATE only if the underlying pattern has ≥1 Tier A/B support OR is an official Claude Code feature with documented behavior; everything else → watchlist appendix.
**Constraints**: ≤4 agents total. Finder angles: (a) high-quality published Claude Code setups (curated lists, well-documented dotclaude/config repos, Anthropic "how our teams use Claude Code"-type posts) — extract concrete capabilities absent from the inventory above; (b) official CC capability audit: current docs/changelog features with documented value that poneglyph doesn't use (cron routines/scheduled agents, remote control, background sessions dashboard, plugin ecosystem, newer hook events, sandboxing, LSP plugins beyond TS); (c) emerging agentic patterns WITH measurement (agentic context engineering / ACE, skill-library learning à la Voyager, self-improvement loops with eval gates, memory-augmented coding agents). Tier+URL+date; UNVERIFIED explicit; counter-evidence mandatory (capabilities that measurably did NOT help or were abandoned).
**Deliverable**: `evidence/W5.md` + `decision-memo-W5.md`: capability-candidates table (capability · evidence tier · what it would do for poneglyph · Commandments fit · cost guess S/M/L) + watchlist appendix.
**Verify**: validations.md checklist for W5 (adds: timebox respected — agent count ≤4 documented).
**Ask first**: nothing — decisions locked.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W-A |
| **Depends on** | none |
| **Blocks** | [US6] |
| **Files touched** | `evidence/W5.md`, `decision-memo-W5.md` |
| **TDD-mode** | optional (validation-mode) |
| **Estimate** | M |
| **Cómo arrancar** | Spawn ≤3 finders (angles a/b/c) in one message; single refuter round; write artefacts; STOP |

## User story

- **As a**: poneglyph owner who suspects unknown-unknowns
- **I want**: a rigorous, bounded sweep of what good setups have that mine doesn't
- **So that**: the 019+ backlog includes genuinely new capabilities, not only fixes to known gaps

## Acceptance criteria

- **AC1** (spec AC1): rigor format + counter-evidence + refuter log in `evidence/W5.md`.
- **AC2** (spec AC2): timebox respected — 1 fan-out + 1 verify round, ≤4 agents, documented in the dossier.
- **AC3** (spec AC4): every CANDIDATE meets the rubric (≥1 A/B or official CC doc); non-qualifying items live in the watchlist, not the memo.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `evidence/W5.md` | Findings per angle, counter-evidence, refuter log, timebox note |
| `decision-memo-W5.md` | Candidates table + watchlist appendix |

## Drillme (Socratic check)

1. `[failure]` What if the sweep finds 30 shiny things? → rubric + watchlist absorb the overflow; candidates table stays ≤10 or it's a smell.
2. `[approach]` Why timebox THIS workstream only? → unbounded discovery is the known failure mode of inspiration research (Commandment III).

## Smell signals

- ⚠️ Any second fan-out round → timebox breach, stop immediately.
- ⚠️ Candidates table >10 entries → rubric applied too loosely; tighten and re-filter.

## Verificación post-implementación

- Smoke: both files exist; candidates table ≤10 rows; watchlist appendix present.

---
us: US6
title: Plans archive — _archive/ gitignored, normalize 13 state.json, relocate audits
wave: W2
depends_on: []
tdd_mode: skip: file moves + json edits, verified by AC
estimate: M
status: draft
absorbs_decision: archive lives in-repo gitignored (zero /flow surgery)
---

# US6 — Archivo de planes + normalización de estados

## Execution prompt (Phase 3 input)

**Task**: Classify plans 001-016 from their artefacts (retro.md approved = closed; spec-only + no activity = abandoned), normalize every `state.json` (all 13 currently `status: null`), move closed/abandoned plans to `.claude/plans/_archive/` (gitignored), relocate audits 005/009 under `.claude/audits/`, archive `plans/011/report.html` with its plan, add the `.gitignore` entry, and a 2-3 line archive-policy note in `flow.md`.
**Context**: Decision locked: in-repo gitignored archive (zero /flow surgery — active paths unchanged). `_research-skill-activation-2026-06-09.md` is cited by CLAUDE.md/docs — stays in plans/ root.
**Constraints**: Before moving each plan, grep inbound references (e.g. 001's tasks/index.md is cited by phase skills as canonical matrix — resolve per case: keep the plan or update the ref). Ratify the full classification with the user BEFORE any move (bulk, semi-irreversible). `git rm` from tracking, files preserved on disk.
**Deliverable**: plans/ contains only 017 + templates/ + retained-by-reference files; truthful state.json everywhere; .gitignore + flow.md updated.
**Verify**: `ls .claude/plans/` matches expectation; `for f in .claude/plans/*/state.json; do jq -e '.feature_closed != null' $f; done` all pass; `/flow --resume 017-personal-optimization` still resolves.
**Ask first**: the classification table (which plans are closed/abandoned) before moving.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | none |
| **Blocks** | none |
| **Files touched** | `.claude/plans/*` (moves), `.gitignore`, `.claude/commands/flow.md` (1 archive-policy note) |
| **TDD-mode** | skip: file moves + json edits, verified by AC |
| **Estimate** | M |
| **Cómo arrancar** | Per plan 001-016: determine real lifecycle state from artefacts (retro.md present + approved = closed) |
| **Decisión absorbida** | `.claude/plans/_archive/` gitignored — active paths unchanged, no accidental reads (not committed, not globbed) |

## User story

- **As a**: Oriol
- **I want**: only the active plan visible in plans/; finished work archived out of accidental-read reach with truthful state
- **So that**: Claude never feeds on stale plans and /flow state is trustworthy

## Acceptance criteria

- **AC1**: Given the 16 plans, when classifying each from its artefacts (spec/retro/review presence + content), then every `state.json` reflects reality (no `status: null` / missing fields; closed features carry `feature_closed: true`). (spec AC3)
- **AC2**: Given classification, when archiving, then closed/abandoned plans move to `.claude/plans/_archive/` (gitignored), audits 005/009 move under `.claude/audits/`, `plans/011/report.html` archives with its plan, and `.claude/plans/` keeps only 017 (active) + `templates/` + `_research-*` files still referenced by live docs.
- **AC3**: Given `/flow --resume`, when pointed at the active plan, then it works unchanged; `flow.md` gains a 2-3 line archive-policy note (where closed plans go).
- **AC4**: Given git, when committing, then `_archive/` is gitignored but the moves of previously-committed files are recorded (git rm from tracking, files preserved on disk).

## Workflow detallado

1. Classify 001-016: read each state.json + artefact presence; build the truth table.
2. AskUserQuestion ratifying the classification (which are truly closed/abandoned) before moving — irreversible-ish bulk move.
3. Normalize state.json per plan; move closed → `_archive/`; relocate audits.
4. `.gitignore` += `.claude/plans/_archive/`; flow.md note.

## Drillme (Socratic check)

1. `[failure]` ¿Y si un plan archivado tiene refs vivas (p.ej. 001 tasks/index.md citado por skills)? → grep inbound refs antes de mover cada uno; los referenciados se quedan o la ref se actualiza (se decide por caso en build).
2. `[context]` ¿_research-skill-activation-2026-06-09.md? → citado por CLAUDE.md/docs — se queda en plans/ raíz.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | state.json deja de mentir |
| X | plans/ solo contiene trabajo vivo |
| VI | Confirmación humana antes del movimiento masivo |

## Verificación post-implementación

- `ls .claude/plans/` → 017, templates/, _research-* (+ los retenidos por refs vivas, justificados).
- `for f in .claude/plans/*/state.json; do jq -e '.feature_closed != null' $f; done` → todos válidos.

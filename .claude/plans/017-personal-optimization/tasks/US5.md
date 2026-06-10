---
us: US5
title: Delete dead artifacts — root HTML, .claude/data/, empty dirs
wave: W2
depends_on: []
tdd_mode: skip: deletion-only, no testable behavior
estimate: S
status: closed
closed: 2026-06-10
implemented: 2026-06-10
---

# US5 — Borrado de artefactos muertos

## Execution prompt (Phase 3 input)

**Task**: Delete dead artifacts: the 4 root HTML files (`project-state-2026-06-08.html`, `project-state-dynamic.html`, `project-state-2026-06-08-glance.html`, `glass-mousepads-comparativa.html`), `.claude/data/` (whole dir, pending .json confirmation), and `.claude/agent-memory/` (empty).
**Context**: data/usage verified 2026-06-10: telemetry remnants from the pipeline cut 2026-05-28, zero inbound references (only this spec mentions it). agent-memory/ is empty and US2 removes its CLAUDE.md reference.
**Constraints**: NEVER touch `html-report/templates/` or `decide/templates/` (live skill components). Re-grep each target for inbound refs immediately before deletion. Use `git rm` so the deletion is tracked and reversible via history.
**Deliverable**: deletions committed.
**Verify**: `ls *.html` at root → empty; `.claude/data` and `.claude/agent-memory` gone (or data/ reduced to .json if user keeps them).
**Ask first**: the .json telemetry files (user approved only the HTML explicitly).

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | none |
| **Blocks** | none |
| **Files touched** | 4 root HTML, `.claude/data/` (whole dir), `.claude/agent-memory/` (empty) |
| **TDD-mode** | skip: deletion-only, no testable behavior |
| **Estimate** | S |
| **Cómo arrancar** | Re-verify zero inbound references (grep) per target, then delete via git rm |
| **Decisión absorbida** | — |

## User story

- **As a**: Oriol
- **I want**: dead outputs gone from the repo
- **So that**: nothing stale pollutes context or repo weight

## Acceptance criteria

- **AC1**: Given the repo after deletion, when globbing `*.html` at root, then 0 files (project-state-2026-06-08.html, project-state-dynamic.html, project-state-2026-06-08-glance.html, glass-mousepads-comparativa.html deleted). (spec AC3)
- **AC2**: Given `.claude/data/`, when the user confirms at build (HTML approved; the 4 telemetry .json + insights.md are remnants of the pipeline cut 2026-05-28 with zero inbound references), then the whole dir is deleted; if the user keeps the .json, only the 2 HTML die.
- **AC3**: Given `.claude/agent-memory/` (empty, nothing populates it — 0 custom agents), when US2 removed its CLAUDE.md reference, then the dir is deleted.
- **AC4**: Given skill/command templates (`html-report/templates/`, `decide/templates/`), when the deletion lands, then they are untouched (live components, not dead HTML).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `project-state-*.html` ×3, `glass-mousepads-comparativa.html` | git rm |
| `.claude/data/` | git rm -r (pending user confirm on .json) |
| `.claude/agent-memory/` | rm (empty dir) |

## Workflow detallado

1. Per target: `grep -r "<filename>"` → confirm 0 inbound refs (data/usage already verified: only spec.md mentions it).
2. AskUserQuestion for the .json telemetry files (only HTML was explicitly approved).
3. `git rm` targets; commit.

## Commandments cubiertos

| # | Cómo |
|---|---|
| VI | Borrado con verificación de referencias + confirmación explícita (irreversible) |
| X | Repo sin peso muerto |

## Verificación post-implementación

- `ls *.html` en raíz → vacío; `ls .claude/data .claude/agent-memory` → no existen (o data/ reducido si el usuario conserva json).

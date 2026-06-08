---
us: US2
title: Cortar builder/reviewer/scout + reconectar build/critic skills
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: closed
closed: 2026-06-05
absorbs_decision: OQ1a-cortar-los-3
---

# US2 — Cortar los 3 agentes + reconectar sus invocadores

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | [US7] |
| **Files touched** | borrar `agents/{builder,reviewer,scout}.md`; archivar `agent-memory/builder/`; editar `build/SKILL.md`, `critic/SKILL.md` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | `git rm` los 3 agents; archivar memory builder a `plans/008-.../archive/` |
| **Decisión absorbida** | OQ1a (cortar los 3) + OQ3 (panel-review en critic) |

## User story

- **As a**: mantenedor del meta-sistema
- **I want**: eliminar los 3 agentes custom y reconectar `build`/`critic` a ejecución inline
- **So that**: desaparezca el atractor que empujaba a delegar a 1 agente

## Acceptance criteria

- **AC1**: Given `.claude/agents/`, when se lista, then `builder.md`, `reviewer.md`, `scout.md` **no existen**.
- **AC2**: Given `agent-memory/builder/MEMORY.md`, when se corta builder, then su contenido queda **archivado** (no borrado) en `plans/008-agent-spawn-policy/archive/`.
- **AC3**: Given `build/SKILL.md`, when se lee Step 3 (decide direct vs delegate), then **ya no delega a `builder`** — ejecuta inline siempre; menciona Workflow `default` subagent solo para fan-out ≥4.
- **AC4** (spec AC5): Given `critic/SKILL.md`, when describe review, then **no delega a `reviewer` agent**; review corre inline, y el review independiente robusto se documenta como **panel ≥4** (enlaza a US6 doc-wiring).
- **AC5**: Given ambos skills, when se busca "context isolation", then 0 ocurrencias.

## Files a crear / a modificar

| Path | Cambio |
|---|---|
| `.claude/agents/builder.md` | **Borrar** |
| `.claude/agents/reviewer.md` | **Borrar** |
| `.claude/agents/scout.md` | **Borrar** |
| `.claude/agent-memory/builder/MEMORY.md` | **Mover** a `plans/008-agent-spawn-policy/archive/builder-MEMORY.md` |
| `.claude/skills/build/SKILL.md` | Step 3 + desc frontmatter: quitar delegación a builder/isolation; ejecución inline; AC7 decision reescrita |
| `.claude/skills/critic/SKILL.md` | Quitar delegación a reviewer; review inline + patrón panel-≥4; línea 267 (ABSORB rationale isolation) reescrita |

## Workflow detallado

1. Archivar `agent-memory/builder/MEMORY.md` → `plans/008-.../archive/`.
2. `git rm .claude/agents/{builder,reviewer,scout}.md`.
3. Editar `build/SKILL.md`: Step 3 tabla → "siempre inline; ≥4 fan-out → Workflow default subagent"; borrar AC7 KEEP-conditional (ya no aplica); quitar desc "delegates to builder for context isolation".
4. Editar `critic/SKILL.md`: review inline; añadir "review independiente robusto = panel ≥4 (ver doc-wiring US6)"; reescribir línea ~267.
5. Verificar que `agent-memory/scout/` (si existe) también se archiva o borra.

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | −3 agentes −aparato delegación = menos superficie |
| X | Mata el atractor (causa raíz Poka-Yoke) |

## Casos edge

- Edge 1: `agent-memory/scout/` o `agent-memory/reviewer/` existen → archivar igual que builder.
- Edge 2: otras skills referencian `builder`/`reviewer`/`scout` por nombre → las cubre US4/US5 (no aquí).

## Verificación post-implementación

- `Glob .claude/agents/{builder,reviewer,scout}.md` → vacío.
- `Grep "context isolation" .claude/skills/{build,critic}/SKILL.md` → 0.
- `bun test ./.claude/hooks/` verde (no toca runtime).

## Open questions

- ¿`scout`/`reviewer` tienen `agent-memory/`? Resolver con Glob al implementar.

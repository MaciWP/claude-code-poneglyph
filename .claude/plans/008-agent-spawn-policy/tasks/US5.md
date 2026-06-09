---
us: US5
title: Reescribir matrices de routing (agent-selection, complexity, error-recovery)
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: closed
closed: 2026-06-09
implemented: 2026-06-09
absorbs_decision: OQ1b-exploracion-Explore
---

# US5 — Reescribir matrices de routing

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | [US7] |
| **Files touched** | `references/04-agent-selection.md`, `references/03-complexity-routing.md`, `rules/error-recovery.md` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Read `04-agent-selection.md` (matriz exploración + selección por señal) |
| **Decisión absorbida** | OQ1b (exploración = `Explore` built-in) |

## User story

- **As a**: Lead
- **I want**: que las matrices de routing reflejen el corte de agentes y la regla de exploración
- **So that**: no enruten a `builder`/`reviewer`/`scout` (que ya no existen)

## Acceptance criteria

- **AC1**: Given `04-agent-selection.md`, when se lee la matriz exploración × selección, then **no nombra `scout`/`builder`/`reviewer`**; exploración masiva read-only → `Explore` (Haiku built-in); trabajo/research → Workflow ≥4.
- **AC2** (spec AC3): Given `03-complexity-routing.md`, when se lee Mode Selection + Model Routing, then refleja: 1-3=inline, ≥4=Workflow/Team; el "Model Routing por agent category (builder/reviewer/scout)" se elimina o se reescribe para agentes de Workflow.
- **AC3**: Given `error-recovery.md`, when describe recovery, then **no asume `builder`/`reviewer` agents** ni "SendMessage to builder"; recovery aplica a agentes de Workflow / inline diagnosis.
- **AC4** (spec AC1): Given los 3, when se busca "context isolation", then 0.

## Files a crear / a modificar

| Path | Cambio |
|---|---|
| `.claude/skills/orchestrator-protocol/references/04-agent-selection.md` | Matriz exploración → `Explore` only (sin scout); Selection Matrix sin builder/reviewer; Multi-Agent Patterns reescritos a Workflow/inline; anti-patterns L139-140 alineados al árbol |
| `.claude/skills/orchestrator-protocol/references/03-complexity-routing.md` | Mode Selection (subagents/tiered/team) → inline/Workflow/Team; Model Routing por agent-category eliminado/reescrito; Worktree decision → contexto Workflow |
| `.claude/rules/error-recovery.md` | Retry budget + SendMessage Recovery: quitar builder/reviewer/teammate-as-builder; reframe a Workflow agents + Lead inline diagnosis |

## Workflow detallado

1. Read los 3 ficheros (matrices + recovery).
2. `04-agent-selection.md`: exploración → `Explore`; quitar filas builder/reviewer/scout; patrones "Build then Review" etc. → inline o Workflow panel.
3. `03-complexity-routing.md`: tabla de modos → {inline (1-3), Workflow (≥4 indep), Team (≥3 dominios negocian)}; quitar model-routing por agente custom.
4. `error-recovery.md`: reescribir SendMessage/retry para Workflow agents + diagnosis inline (Lead); preservar `diagnostic-patterns` invocation.
5. Todo apunta al árbol (US1) para umbrales.

## Commandments cubiertos

| # | Cómo |
|---|---|
| X | Matrices coherentes con el corte de agentes |
| VII | Exploración barata (`Explore` Haiku) preservada; ≥4 = Workflow |

## Verificación post-implementación

- `Grep "scout|builder|reviewer" -i` en los 3 → solo como referencia histórica/Workflow-agentType, 0 como spawn-target directo.
- `Grep "context isolation"` → 0.

## Open questions

- ¿`error-recovery.md` Worktree/Teammate sections se conservan (aplican a Workflow/Team) o se podan? Default: conservar las que apliquen a Workflow/Team, podar las builder-específicas.

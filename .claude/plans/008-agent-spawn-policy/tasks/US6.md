---
us: US6
title: Doc-wiring de Workflow + team-mode + classification-waves
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: closed
absorbs_decision: OQ4-panel-review-condicion-dura
---

# US6 — Doc-wiring de Workflow + corrección team/waves

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | [US10] |
| **Files touched** | doc-wiring (nuevo), `tech-plan/references/05-team-mode.md`, `tech-plan/references/04-classification-waves.md`, `tech-plan/SKILL.md` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Redactar doc-wiring: cuándo Workflow vs Team + patrón panel-review ≥4 |
| **Decisión absorbida** | OQ4 + condición-dura (panel-≥4 reemplaza reviewer) |

## User story

- **As a**: Lead
- **I want**: saber cuándo/cómo aprovechar workflows (+ patrón panel-review ≥4) y que team-mode/waves dejen de referenciar agentes muertos
- **So that**: la cara positiva de la política sea accionable y no quede doc obsoleta

## Acceptance criteria

- **AC1** (spec AC4): Given el doc-wiring, then documenta el *wiring* (cuándo Workflow, umbral ≥4, fork Workflow-vs-Team) y **enlaza** al catálogo de la Workflow tool — **no transcribe** pipeline/parallel/quality-patterns.
- **AC2** (condición dura): Given el doc-wiring, then existe el patrón **"panel de review ≥4 enfoques"** con prompt canónico (rol + read-only-por-prompt + qué skills leer) — reemplazo de `reviewer` (lección 002).
- **AC3** (spec AC5): Given `05-team-mode.md`, then **0 refs al agente `planner`** ni a builder/reviewer/scout como teammates custom (#24316: general-purpose; #31977: no-spawn); `Four-Eyes` reenmarcado (intra-team o escala a panel ≥4, nunca spawn 1+1).
- **AC4**: Given `04-classification-waves.md`, when usa ejemplos (`Task(reviewer,…)`, scout-fan-out, builder-per-module), then **reescritos** a Workflow `agent()`/`parallel()`/`Explore` o marcados como patrón Workflow.
- **AC5**: Given `tech-plan/SKILL.md:314`, when menciona "agents/builder|reviewer|scout" (nota de migración), then actualizada al estado real (0 agentes custom).
- **AC6**: Given coherencia team "3+ dominios" vs ≥4, then declarada **ortogonal** (team = negociación de interfaces, no conteo).

## Files a crear / a modificar

| Path | Cambio |
|---|---|
| doc-wiring (inline en `orchestrator-protocol/SKILL.md` si ≤40 líneas, si no `orchestrator-protocol/references/07-workflow-wiring.md`) | **Crear**: Workflow-vs-Team + patrón panel-≥4 + enlace a la tool |
| `.claude/skills/tech-plan/references/05-team-mode.md` | Borrar `planner` (L49/69/111); reframe Four-Eyes; teammates general-purpose (#24316/#31977); ortogonalidad ≥4 |
| `.claude/skills/tech-plan/references/04-classification-waves.md` | Ejemplos de waves (L51,78-108) → Workflow `agent()`/`Explore`; quitar builder/scout/reviewer como agentes vivos |
| `.claude/skills/tech-plan/SKILL.md` | L314: nota de migración actualizada (0 agentes) |

## Workflow detallado

1. Borrador doc-wiring; si >40 líneas → `references/07-workflow-wiring.md` + link desde el árbol (US1).
2. Redactar wiring: fork Workflow (≥4 indep) vs Team (≥3 dominios negocian); enlazar a la tool, no copiar.
3. Redactar patrón **panel-review ≥4** (condición dura): prompt canónico N reviewers frescos (rol, "no edites", leer `review-patterns`/`security-review`).
4. `05-team-mode.md`: quitar `planner`; reframe Four-Eyes; nota #24316/#31977; ortogonalidad.
5. `04-classification-waves.md`: reescribir ejemplos a Workflow/Explore.
6. `tech-plan/SKILL.md:314`: actualizar nota.

## Commandments cubiertos

| # | Cómo |
|---|---|
| VII | Aprovechar paralelismo correctamente (Workflow) |
| X | team-mode/waves desobsoletizados; sin duplicar el catálogo de la tool |

## Casos edge

- Edge 1: doc-wiring >40 líneas → reference nueva + link.
- Edge 2: "3+ dominios" vs ≥4 → declarar ortogonal.

## Verificación post-implementación

- `Grep "planner|Task\(reviewer" 05-team-mode.md 04-classification-waves.md` → 0 como agente/spawn vivo.
- `Grep "panel de review"` doc-wiring → existe.

## Open questions

- Ubicación doc-wiring (se mide al redactar).

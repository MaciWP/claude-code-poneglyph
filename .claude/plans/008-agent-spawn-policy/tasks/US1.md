---
us: US1
title: Árbol de decisión de spawn canónico + orchestrator-protocol completo
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: closed
closed: 2026-06-05
absorbs_decision: arbol-2-ejes-P1-P7
---

# US1 — Árbol de decisión de spawn canónico

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | `none` |
| **Blocks** | [US2-US9] |
| **Files touched** | `orchestrator-protocol/SKILL.md` (COMPLETO: Triggers, tabla `Agent(subagent_type)`, skills-frontmatter, complexity table, post-multi-file) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Read `orchestrator-protocol/SKILL.md` entero; localizar las 8 zonas con refs a agentes (L59-61, 69, 80-81, 90-94, 97, 105-106) |
| **Decisión absorbida** | árbol 2-ejes + P1-P7 |

## User story

- **As a**: Lead orquestador
- **I want**: un único árbol de decisión de spawn en el SKILL canónico, sin refs a agentes muertos
- **So that**: ningún path licencie "1 agente por isolation" ni enrute a builder/reviewer/scout

## Acceptance criteria

- **AC1** (spec AC2): Given `orchestrator-protocol/SKILL.md`, when se lee la delegación, then **un solo árbol canónico** (eje-1 cantidad + eje-2 naturaleza); Triggers A/C ya no coexisten como reglas separadas.
- **AC2** (spec AC1): Given el SKILL, when se busca "context isolation", then 0 como justificación de spawn.
- **AC3** (spec AC3): Given el árbol, when una unidad toca ≥5 files, then inline (≥5 NO es trigger de spawn).
- **AC4** (spec AC4): Given el eje-2, then independientes→**Workflow**; ≥3 dominios que negocian→**Team**.
- **AC5**: Given el SKILL completo, when se busca `Agent(subagent_type="builder|reviewer|scout")` / "skills frontmatter (builder→…)" / "diagnose builder failures" / "Delegate to reviewer agent" (L80-81, 90-94, 97, 105-106), then **reescritas**: spawn vía Workflow `default` subagent / inline / panel-≥4; `Explore` = exploración (no spawn-de-trabajo).
- **AC6**: Given el árbol, then incluye P1-P7 del spec + declara "único punto de verdad".

## Files a crear / a modificar

| Path | Cambio |
|---|---|
| `.claude/skills/orchestrator-protocol/SKILL.md` | (a) Triggers A/C → árbol 2-ejes + P1-P7; (b) Trigger B exploración → `Explore` (sin scout como agente custom); (c) tabla `Agent(subagent_type=…)` (L90-92) → Workflow agentType / inline; (d) skills-frontmatter (L80-81) → nota histórica o reescrita; (e) L94 diagnose builder → "Lead inline + diagnostic-patterns"; (f) L105-106 reviewer → critic/panel-≥4; (g) complexity L69 builder-direct → inline |

## Workflow detallado

1. Read `orchestrator-protocol/SKILL.md` entero.
2. Reescribir Triggers (L59-61) al árbol canónico (mermaid del spec + P1-P7). Preservar Trigger B sensitive-paths/destructive (ortogonal, no es spawn).
3. Trigger exploración (L60): `Explore` built-in (Haiku) es lectura, no agente-de-trabajo; eliminar `scout` como opción de agente custom.
4. Barrer las demás zonas (L69, 80-81, 90-94, 97, 105-106): reescribir cada ref a builder/reviewer/scout → inline / Workflow default / panel-≥4 / `Explore`.
5. Declarar "único punto de verdad; el resto del sistema referencia, no redefine".

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | 2 reglas contradictorias → 1 árbol |
| X | Único punto de verdad; sin refs a agentes muertos en el SKILL canónico |

## Verificación post-implementación

- `Grep -i "context isolation|subagent_type=.(builder|reviewer|scout)" orchestrator-protocol/SKILL.md` → 0.
- Lectura: árbol cubre inline/Workflow/Team/Explore sin contradicción.

## Open questions

- Ninguna (contenido del spec).

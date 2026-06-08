---
us: US4
title: AC10 multi-round proactive questioning in /flow + orchestrator-protocol
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: closed
approved: 2026-06-08
closed: 2026-06-08
absorbs_decision: ac10-to-both-flow-and-orchestrator
---

# US4 — AC10: multi-round proactive questioning (flow + orchestrator-protocol)

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | `none` |
| **Blocks** | `none` |
| **Files touched** | `.claude/commands/flow.md`, `.claude/skills/orchestrator-protocol/SKILL.md` |
| **TDD-mode** | optional (validation-mode: lectura) |
| **Estimate** | M |
| **Cómo arrancar** | `Read` ambos ficheros; insertar la regla de multi-round questioning donde mejor cohesione |
| **Decisión absorbida** | placement: AC10 → ambos (flow + orchestrator) |

## User story

- **As a**: Oriol
- **I want**: que Claude pregunte en múltiples rondas mientras surjan dudas reales — incluidas laterales/mejoras — en vez de quedarse en 1 ronda
- **So that**: el alcance y la calidad se afinen antes de ejecutar, sin caer en ceremonia

## Acceptance criteria

- **AC1 (en /flow)**: Given `commands/flow.md`, when se edita, then los hard gates (1→2, 2→3) y la fase scope/drillme documentan explícitamente: **múltiples rondas de preguntas mientras haya duda real + preguntas laterales/mejoras proactivas**, no quedarse en 1 ronda. (spec AC10)
- **AC2 (en orchestrator-protocol)**: Given `orchestrator-protocol/SKILL.md`, when se edita, then el protocolo turn-level (Step 1 Triage o principio nuevo) codifica la misma regla a nivel de turno (dentro o fuera de `/flow`). (spec AC10)
- **AC3 (calibrado, anti-ceremonia)**: Given la regla, then incluye el límite: preguntar solo mientras la duda sea **genuina y cambie el resultado**; converger y declararlo cuando no queden dudas reales (Commandment III). (spec AC10, AC3 umbral)
- **AC4 (laterales/mejoras)**: Given la regla, then habilita explícitamente preguntar cosas laterales o proponer mejoras proactivas, no solo el set mínimo.
- **AC5 (terseness del skill)**: Given que `orchestrator-protocol` es terso, then la adición es condensada (1 fila/bullet o 2), sin inflar el skill.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/commands/flow.md` | +regla multi-round + laterales/mejoras en gates y drillme de fase (sección "SIEMPRE rules" o gates) |
| `.claude/skills/orchestrator-protocol/SKILL.md` | +regla turn-level (Step 1 Triage o principio), condensada |

## Workflow detallado

1. `Read commands/flow.md` + `orchestrator-protocol/SKILL.md`.
2. En `flow.md`: añadir a "SIEMPRE rules" (o a los hard gates) la regla de rondas múltiples + laterales, con el calibrado anti-ceremonia.
3. En `orchestrator-protocol/SKILL.md`: añadir en Step 1 Triage (o como principio breve) la misma regla a nivel de turno. Condensado.
4. Verificar coherencia con el `drillme` skill existente (que ya soporta iteración) — referenciarlo, no duplicarlo.

## Drillme (Socratic check)

1. `[location]` ¿flow y orchestrator (ambos)? — Sí, decisión del usuario: flow = nivel feature/gates; orchestrator = nivel turno.
2. `[approach]` ¿Regla nueva vs reusar drillme (que ya itera)? — Reusar drillme para la mecánica de iteración; la regla solo INSTRUYE a no parar en 1 ronda + permitir laterales. No duplicar.
3. `[context]` ¿Choca con terseness/Commandment III (no ceremonia)? — Por eso AC3 calibra: preguntar solo mientras la duda sea real; converger explícito.
4. `[failure]` ¿Y si genera bucle de preguntas infinito? — Calibrado: converger cuando no haya duda que cambie el resultado; declararlo (anti-pattern drillme ">10 preguntas").

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Preguntar en rondas = honest symbiosis (alinear antes de actuar) |
| III | Calibrado anti-ceremonia |
| V | Entender antes de actuar, reforzado |

## Reutiliza

- `drillme` skill — mecánica de iteración de preguntas (no se duplica; se referencia).

## Verificación post-implementación

- `grep -i "múltiples rondas\|rondas\|laterales\|proactiv" .claude/commands/flow.md` → match.
- `grep -i "rondas\|proactiv\|laterales" .claude/skills/orchestrator-protocol/SKILL.md` → match.
- Lectura: la adición a orchestrator-protocol es condensada (no infla el skill).
- `bun test ./.claude/hooks/` sigue pasando.

## Open questions (a resolver en implementación)

- ¿En orchestrator-protocol va dentro de Step 1 Triage o como principio §0.5? — decidir al editar por cohesión + terseness.

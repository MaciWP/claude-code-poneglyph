---
us: US3
title: description + when_to_use en todas las skills (~23) — pushy pero lean, gatillos ES+EN
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: closed
approved: 2026-06-23
---

# US3 — description + when_to_use en todas las skills

## Execution prompt (Phase 3 input)

**Task**: Pasada de frontmatter en las ~23 skills de `.claude/skills/*/SKILL.md`: separar una `description` concisa (qué hace + caso de uso primero) del campo oficial `when_to_use` (frases-gatillo y ejemplos, **ES+EN**), directivas/pushy pero LEAN, respetando el cap combinado 1.536 chars y sin overflow del presupuesto de listing.
**Context**: Verificado en doc oficial (WebFetch 2026-06-23): `when_to_use` = "Additional context for when Claude should invoke the skill, such as trigger phrases or example requests. Appended to description… counts toward the 1,536-character cap." Hoy las skills meten todo en `description` con `Use when`+`Keywords` inline (ver muestreo: scope/build/critic/drillme ya directivas). El sesgo del usuario: preferir falsa-activación a no-activación. Presupuesto: 1% de contexto; overflow dropea las menos usadas → `skillOverrides: name-only` para low-priority si hace falta, `/doctor` para diagnosticar.
**Constraints**: PRIMERO verificar que `when_to_use` funciona en la versión CC instalada (si no, mantener todo en `description` y registrar). NO reescribir el cuerpo de las skills (solo frontmatter). Tercera persona. Caso de uso primero (sobrevive al truncado). Inglés en los ficheros, pero los gatillos incluyen frases ES que el usuario diría. NO inflar a ciegas: medir contra el cap 1.536 por skill.
**Deliverable**: frontmatter actualizado en las ~23 SKILL.md (description concisa + `when_to_use` ES/EN) + reporte de `/doctor` confirmando que ninguna description se dropea + tabla de antes/después de longitudes.
**Verify**: cada skill ≤1.536 combinados; `/doctor` sin warnings de drop; re-medida de activación ES/EN con evals (AC2/AC4 del spec).
**Ask first**: nada — patrón cerrado; si `when_to_use` no existe en la versión instalada, parar y reportar (cambia el enfoque, no el objetivo).

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | none |
| **Files touched** | `.claude/skills/*/SKILL.md` (~23) — solo frontmatter |
| **TDD-mode** | optional (validación, no código) |
| **Estimate** | M |
| **Cómo arrancar** | Verificar `when_to_use` en versión instalada; medir longitudes actuales |
| **Decisión absorbida** | Formato canónico description+when_to_use (afecta US1) |

## User story

- **As a**: Lead que selecciona skills por su listing
- **I want**: descriptions directivas + when_to_use con gatillos ES/EN
- **So that**: la selección nativa dispare mejor, incluso en prompts en español

## Acceptance criteria

- **AC1**: Given la versión CC instalada, when se verifica, then se confirma que `when_to_use` es soportado (o se documenta el fallback a description-only).
- **AC2**: Given cada SKILL.md, when se revisa, then tiene `description` concisa (caso primero) + `when_to_use` con gatillos ES+EN, ≤1.536 combinados.
- **AC3**: Given `/doctor`, when se corre, then ninguna description se dropea por presupuesto.
- **AC4**: Re-medida de activación ES/EN ≥ baseline.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/*/SKILL.md` (~23) | Frontmatter: description concisa + when_to_use ES/EN |

## Workflow detallado

1. Verificar `when_to_use` en versión instalada (smoke con una skill). Si no existe → parar, reportar, fallback.
2. Medir longitudes actuales de cada description (baseline de chars).
3. Por skill: extraer gatillos a `when_to_use` (ES+EN), dejar `description` concisa con caso de uso primero, pushy pero lean, ≤1.536.
4. `/doctor` para confirmar sin drops; `skillOverrides: name-only` para low-priority si hace falta liberar presupuesto.
5. Re-medir activación con evals.

## Drillme (Socratic check)

1. `[approach]` ¿pushy hasta dónde? → sesgo a falso-positivo (preferencia usuario) PERO lean por el presupuesto de listing.
2. `[failure]` ¿inflar las 23 dropea las menos usadas? → medir con `/doctor`; usar name-only en low-priority.
3. `[context]` ¿coordina con US1? → US1 escribe su propia description con este mismo patrón.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Verificar `when_to_use` en versión instalada antes de aplicar |
| VII | Lean: respeta presupuesto, no infla a ciegas |

## Verificación post-implementación

- `/doctor` sin warnings de drop.
- Evals: activación ES/EN ≥ baseline.

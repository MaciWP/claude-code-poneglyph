---
us: US6
title: Integración + informe demo (dogfooding) + docs SKILL.md
wave: W4
depends_on: [US4, US5]
tdd_mode: optional
estimate: M
status: closed
approved:
---

# US6 — Integración + informe demo + docs

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W4 |
| **Depends on** | [US4, US5] |
| **Blocks** | `none` (cierre) |
| **Files touched** | `.claude/skills/html-report/scripts/render.ts` (wire), `SKILL.md`, `references/pre-flight-checklist.md`, demo data + `out` HTML |
| **TDD-mode** | optional (validación = AC del spec, humana + smoke) |
| **Estimate** | M |
| **Cómo arrancar** | Cablear components.ts + charts.ts en render.ts y regenerar el informe de estado |
| **Decisión absorbida** | — |

## User story

- **As a**: Oriol
- **I want**: el generador integrado + un informe de demostración que se vea espectacular + docs
- **So that**: puedo usar el modo dynamic ya y el skill queda documentado

## Acceptance criteria

- **AC1**: Given el generador completo, when `render(estadoProyectoData)`, then produce el "estado del proyecto" como informe **dynamic** (charts + tablas filtrables + nav + sidenotes) en 1 fichero.
- **AC2**: Given el demo, when se valida contra el spec, then cumple AC1-AC6 del spec: self-contained (red off), responsive ≤400px, contraste ≥4.5:1, fallback sin-JS, y la mejora vs `glance` es **evidente** (validación humana de Oriol — AC6).
- **AC3**: Given `SKILL.md`, when se lee, then documenta el **modo dynamic** + el generador (contrato de datos, `bun run render.ts`, cuándo usarlo vs report/glance) + actualiza el `pre-flight` v2 (incluye fallback-sin-JS + responsive móvil).
- **AC4**: Given `bun test ./.claude/hooks/`, then sigue 100/100 (sin regresión).

## Files a crear / a modificar

| Path | Cambio |
|---|---|
| `.claude/skills/html-report/scripts/render.ts` | Cablear `components.ts` + `charts.ts` en los slots |
| `.claude/skills/html-report/scripts/demo-estado.json` (o inline) | Datos del informe de estado para el demo |
| `.claude/skills/html-report/SKILL.md` | Sección "Modo dynamic (generador)" + cuándo usarlo + contrato + comando |
| `.claude/skills/html-report/references/pre-flight-checklist.md` | Añadir checks: fallback sin-JS, responsive móvil, generador |

## Workflow detallado

1. Cablear componentes + charts en `render.ts`.
2. Construir `demo-estado.json` con los datos reales del estado del proyecto (9 features, items abiertos, etc.).
3. `bun run render.ts < demo-estado.json > project-state-dynamic.html`.
4. Validar AC1-AC6 del spec (abrir en navegador desktop+móvil, red off, sin JS).
5. Documentar en `SKILL.md` + actualizar pre-flight.
6. `bun test ./.claude/hooks/` → 100/100.

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Dogfooding: el propio informe de estado valida el resultado |
| IX | AC6 = validación humana de la mejora (medible, no autoengaño) |
| X | SKILL.md documenta el nuevo modo; skill no rota |

## Verificación post-implementación

- Smoke: el demo abre, charts con tooltip, tabla filtra, nav sticky, theme toggle; red off OK; móvil OK.
- `bun test ./.claude/hooks/` sigue 100/100.
- Comparación lado a lado glance vs dynamic → mejora evidente (Oriol valida AC6).

## Open questions

- ¿Fijar `dynamic` como 5º modo nombrado en el SKILL.md o como "generador" transversal? Resolver aquí con Oriol.

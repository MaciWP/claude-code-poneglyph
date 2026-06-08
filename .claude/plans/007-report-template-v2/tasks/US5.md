---
us: US5
title: Integración — html-report SKILL.md + pre-flight + components.html para los nuevos templates
wave: W3
depends_on: [US1, US2, US3]
tdd_mode: optional
estimate: M
status: closed
---

# US5 — Integración (SKILL + pre-flight + components)

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W3 |
| **Depends on** | [US1, US2, US3] |
| **Blocks** | none |
| **Files touched** | `.claude/skills/html-report/SKILL.md`; `references/pre-flight-checklist.md`; `templates/components.html` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Documentar en SKILL.md los 3 layouts (report/dashboard/glance/decision) + cuándo usar cada uno |
| **Decisión absorbida** | — |

## User story

- **As a**: el propio skill `html-report` (y quien lo invoque)
- **I want**: que SKILL.md, el pre-flight y la galería de componentes reflejen los nuevos templates y el flujo de diagramas
- **So that**: la generación consuma el sistema correctamente y el output sea cliente-ready verificable

## Acceptance criteria

- **AC1**: Given SKILL.md, when se lee, then documenta los layouts disponibles (report · dashboard · **glance** · **decision**), cuándo usar cada uno, y el flujo de **diagramas SVG-first / JS opt-in**.
- **AC2**: Given `pre-flight-checklist.md`, when se cierra una generación, then incluye ítems de **cliente-ready** (vistazo above-the-fold, diagrama legible, self-contained verificado) — spec AC4.
- **AC3**: Given `components.html`, when se inspecciona, then añade a la galería los componentes nuevos (filtro CSS, card expandible, diagram, chart/matriz) referenciando US1/US2/US3.
- **AC4**: Given los layouts antiguos (report/dashboard), when se valida, then siguen documentados y funcionando — no regresión (spec AC5).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/html-report/SKILL.md` | Tabla de layouts (report/dashboard/glance/decision) + cuándo usar; sección diagramas híbrido; cross-ref a visuals-svg-first.md |
| `.claude/skills/html-report/references/pre-flight-checklist.md` | + ítems cliente-ready (vistazo, diagrama, self-contained) |
| `.claude/skills/html-report/templates/components.html` | + galería: filtro CSS, card expandible (de US1), diagram + chart/matriz (de US2/US3) |

## Workflow detallado

1. Actualizar SKILL.md §When to use / templates: añadir glance + decision, criterio de elección, flujo diagramas.
2. Ampliar pre-flight con el gate "cliente-ready" (sin reformular el corpus taste — solo añadir; Cmd X).
3. Añadir los componentes nuevos a components.html (markup + nota de origen).
4. Verificar no-regresión de report/dashboard (siguen referenciados y válidos).

## Commandments cubiertos

| # | Cómo |
|---|---|
| IV | pre-flight = gate de calidad cliente-ready |
| X | Documenta sin duplicar el corpus 004; SKILL.md sigue <500 líneas (detalle en references) |

## Reutiliza

- Corpus taste 004 (`taste-hard-rules`, `anti-slop`, `critique-mode`).

## Verificación post-implementación

- Smoke: SKILL.md lista 4 layouts; pre-flight corre sobre un render glance/decision con 0 fallos.
- `Grep` report/dashboard en SKILL.md → siguen presentes (no-regresión).
- `bun test ./.claude/hooks/` sigue verde.

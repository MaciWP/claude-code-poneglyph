---
us: US1
title: glance.template.html — bake del estilo glance aprobado (plan 006) a template oficial
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: closed
absorbs_decision: dark-token-block-canonico
---

# US1 — glance.template.html

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | [US3, US5] |
| **Files touched** | `.claude/skills/html-report/templates/glance.template.html` (nuevo) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Tomar `.claude/plans/006-cc-release-feature-audit/report-glance-v2.html` como base y parametrizarlo a template con `{{PLACEHOLDERS}}` |
| **Decisión absorbida** | dark-token-block canónico (inline, verbatim para US3) |

## User story

- **As a**: Oriol generando reportes
- **I want**: un template "glance" oficial que se lea de un vistazo (KPIs + acción destacada + cards filtrables/expandibles)
- **So that**: cada informe sea escaneable y presentable sin retoque, en el estilo dark aprobado

## Acceptance criteria

- **AC1**: Given el render, when se abre, then muestra masthead + acción inmediata + fila KPI (color=info) + distribución, todo above-the-fold (AC1 spec).
- **AC2**: Given findings, when se listan, then van en **grid responsive de cards expandibles** (`<details>`, detalle on-demand) con **filtro CSS-only** por categoría — 0 JS.
- **AC3**: Given el archivo, when se inspecciona, then es self-contained (1 `<style>`, 1 link Google Fonts, sin JS) y define el **bloque de tokens dark canónico** inline.
- **AC4**: Given `prefers-color-scheme` + `@media print`, when se conmutan, then degrada correctamente (print legible, motion tras `prefers-reduced-motion`).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/html-report/templates/glance.template.html` | Nuevo template parametrizado desde report-glance-v2.html (placeholders para título/lede/KPIs/findings/distribución/próximos pasos) |

## Workflow detallado

1. Copiar `006/report-glance-v2.html` como base; extraer el bloque `:root` dark + componentes (kpi, nowbar, sevbar, filtro CSS, card `<details>`, drawer, reco) como CSS canónico.
2. Parametrizar contenido con `{{PLACEHOLDERS}}` (TITLE, LEDE, NOW_ACTION, KPI_CARDS, SEVBAR, FINDING_CARDS, DRAWER_ROWS, RECO).
3. Documentar en cabecera del template el contrato de placeholders + nota "dark token block = canónico, US3 lo inlina verbatim".
4. Verificar contra pre-flight (anti-slop + taste-hard-rules de 004).

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Reusa el diseño ya aprobado (no reinventa); self-contained sin JS |
| VIII | Consume corpus taste 004 + estilo validado por el usuario |
| X | Token block único; mismo contrato que report.template↔tokens.css |

## Reutiliza

- `006/report-glance-v2.html` — base de diseño (ya aprobada por el usuario).
- `references/taste-hard-rules.md` + `anti-slop.md` — gate de calidad.

## Verificación post-implementación

- Smoke: rellenar el template con datos de muestra → render se lee de un vistazo, filtro y expand funcionan sin JS.
- Pre-flight checklist: 0 fallos.
- `bun test ./.claude/hooks/` sigue verde (no toca hooks).

---
us: US4
title: Componentes de contenido — callouts, tablas filtrables, sidenotes
wave: W3
depends_on: [US3]
tdd_mode: optional
estimate: M
status: closed
approved:
---

# US4 — Componentes de contenido

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W3 |
| **Depends on** | [US3] |
| **Blocks** | US6 |
| **Files touched** | `.claude/skills/html-report/scripts/components.ts`, `.claude/skills/html-report/scripts/components.test.ts` |
| **TDD-mode** | optional (tests de smoke en la lógica de filtro) |
| **Estimate** | M |
| **Cómo arrancar** | Función `callout(data)` + `table(data)` + `sidenote(data)` que devuelven HTML |
| **Decisión absorbida** | — |

## User story

- **As a**: autor del informe
- **I want**: callouts semánticos, tablas con filtro/búsqueda y sidenotes editoriales
- **So that**: el informe rompe la monotonía de cajas y se lee como documento profesional

## Acceptance criteria

- **AC1**: Given `callout(data)`, when se renderiza, then produce variantes semánticas (note/tip/warn/danger) restrained estilo Quarto — sin "eyebrow mono-uppercase" en cada bloque (corrige el MAJOR de la crítica).
- **AC2**: Given `table(data, {filterable:true})`, when el usuario escribe en el buscador o pulsa un filtro, then las filas se filtran **en vivo**; **sin JS**, la tabla completa es visible (fallback).
- **AC3**: Given `sidenote(data)`, when desktop, then aparece al **margen** (Tufte); when móvil, then se integra inline/colapsable — sin romper el flujo.
- **AC4**: Given el render, then **no toda la página son cajas idénticas** (sidenotes + jerarquía tipográfica rompen el patrón) → satisface AC5 del spec.

## Files a crear / a modificar

| Path | Contenido |
|---|---|
| `.claude/skills/html-report/scripts/components.ts` | `callout()`, `table()` (con filtro/búsqueda JS + fallback), `sidenote()` (margin/inline responsive) |
| `.claude/skills/html-report/scripts/components.test.ts` | Smoke: la tabla filtrable incluye los data-attrs de filtro; sin JS las filas están en el markup |

## Workflow detallado

1. `callout()` — 4 variantes, color por token semántico (no eyebrow-overload).
2. `table()` — markup con todas las filas + JS de filtro/búsqueda (input + data-attrs); fallback = filas visibles.
3. `sidenote()` — patrón Tufte: `<aside>` posicionado al margen en desktop, inline en móvil (CSS only).
4. Integrar en el shell de US3 (slots).

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Componentes simples, CSS-first; JS solo para filtro |
| (crítica) | Corrige 2 de los 3 MAJOR: monotonía de cajas + eyebrow-overload |

## Verificación post-implementación

- Smoke: render con tabla filtrable → buscar un término oculta filas (en navegador); sin JS todas visibles.
- `bun test .claude/skills/html-report/scripts/components.test.ts` verde.

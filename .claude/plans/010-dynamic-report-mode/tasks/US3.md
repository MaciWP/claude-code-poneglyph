---
us: US3
title: Generador core render.ts + shell interactivo self-contained
wave: W2
depends_on: [US2]
tdd_mode: forced
estimate: L
status: closed
approved:
absorbs_decision: generador-determinista
---

# US3 — Generador core `render.ts` + shell interactivo

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US2] |
| **Blocks** | US4, US5 |
| **Files touched** | `.claude/skills/html-report/scripts/render.ts`, `.claude/skills/html-report/scripts/render.test.ts` |
| **TDD-mode** | forced (script con lógica → red→green) |
| **Estimate** | L |
| **Cómo arrancar** | Escribir el test: `render(minimalData)` produce 1 HTML con `<style>` y sin `<script src>` externo |
| **Decisión absorbida** | generador-determinista (Opción B) |

## User story

- **As a**: Claude / cualquier consumidor del skill
- **I want**: `render(data) → string HTML` self-contained, con shell interactivo
- **So that**: producir un informe dinámico = pasar datos, sin escribir CSS/HTML a mano

## Acceptance criteria

- **AC1**: Given un `ReportData` válido, when `render(data)`, then devuelve **1 string HTML** con TODO inline (1 `<style>`, JS inline o `<script>` sin `src` externo salvo 1 Google Fonts `<link>`), 0 CDN de framework.
- **AC2**: Given el HTML, when se abre sin JS, then es **legible** (fallback): nav como ancla, secciones expandidas, contenido completo visible.
- **AC3**: Given el HTML con JS, then funciona: **nav sticky + scrollspy** (marca sección activa), **secciones colapsables**, y **theme toggle** claro/oscuro persistente (localStorage).
- **AC4**: Given viewport ≤400px, when se renderiza, then el layout es usable (nav colapsa, sin overflow horizontal).
- **AC5 (TDD)**: `render.test.ts` cubre: salida contiene `<style>`, no contiene `<script src=`http`, incluye cada `section.id` del input, y degrada (markup presente aunque sin JS).

## Files a crear / a modificar

| Path | Contenido |
|---|---|
| `.claude/skills/html-report/scripts/render.ts` | `render(data: ReportData): string` — compone shell (header, nav, sections, footer) + inyecta `theme.ts` CSS + JS de nav/scrollspy/collapse/theme con `prefers-reduced-motion` + `:focus-visible` ring |
| `.claude/skills/html-report/scripts/render.test.ts` | Tests red→green de AC5 (bun:test) |

## Workflow detallado

1. **Red**: escribir `render.test.ts` con los asserts de AC5 → falla (no existe `render`).
2. **Green**: implementar `render.ts` con el shell mínimo + import de `theme.ts`/`contract.ts`.
3. JS inline: scrollspy (IntersectionObserver), collapse (`<details>` o toggle), theme toggle (localStorage), todo con fallback.
4. Responsive: media queries en el CSS de `theme.ts`/shell.
5. Verificar test verde + abrir un render mínimo.

## Drillme (Socratic check)

1. `[location]` ¿`scripts/` dentro del skill? → sí, mantiene el skill autocontenido.
2. `[approach]` ¿IntersectionObserver vs scroll listener para scrollspy? → IO (perf + simple).
3. `[failure]` ¿Sin JS el doc sirve? → AC2 lo exige: fallback estático legible.
4. `[context]` ¿Cómo recibe los componentes (US4) y charts (US5)? → slots/funciones que US4/US5 rellenan.

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Shell mínimo; JS solo el necesario; fallback sin JS |
| IV | TDD forced: test red→green gate del nodo |
| VII | Generador baja tokens de generación (datos vs HTML a mano) |

## Verificación post-implementación

- Smoke: `bun run .claude/skills/html-report/scripts/render.ts < demo.json > out.html` produce HTML abrible.
- `bun test .claude/skills/html-report/scripts/render.test.ts` verde.
- `bun test ./.claude/hooks/` sigue 100/100.

## Smell signals

- ⚠️ Si `render.ts` supera ~400 líneas o mezcla charts/tablas → mover esa lógica a US4/US5 (atomicidad).

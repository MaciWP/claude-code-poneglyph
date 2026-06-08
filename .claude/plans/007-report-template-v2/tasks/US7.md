---
us: US7
title: Interactividad shadcn (tabs/tooltips CSS-only + command JS opt-in)
wave: extra
depends_on: [US1]
tdd_mode: optional
estimate: M
status: closed
absorbs_decision: scope-extra-shadcn
---

# US7 — Interactividad shadcn

> **Scope-extra ratificado 2026-06-03.** Deliverable = `smoke-components-shadcn.html` (referencia canónica). Cableado fino a templates = evolución futura.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Depends on** | [US1] |
| **Files touched** | `smoke-components-shadcn.html` (referencia) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Decisión absorbida** | scope-extra shadcn |

## User story

- **As a**: Oriol presentando un documento de un vistazo
- **I want**: tabs, tooltips y command/buscar
- **So that**: navegar/filtrar y ver detalle on-demand sin saturar el primer vistazo

## Acceptance criteria

- **AC1**: Given tabs, when se conmutan, then funcionan **sin JS** (radio-hack) y son navegables por teclado (focus-ring visible).
- **AC2**: Given un término con tooltip, when hover **o focus**, then muestra la hover-card — **sin JS** (CSS `:hover`/`:focus-visible`).
- **AC3**: Given la barra command, when se teclea, then filtra la lista; `esc` limpia — **JS mínimo vanilla inline** (ruta opt-in declarada en el fichero; rompe 0-JS puro, autorizado por el usuario).
- **AC4**: Given cualquier elemento interactivo, when recibe foco por teclado, then muestra `:focus-visible` ring (`--ring`).

## Files

| Path | Cambio |
|---|---|
| `smoke-components-shadcn.html` | tabs (CSS) + tooltip (CSS) + command (JS mínimo) + focus-ring (entregado) |

## Verificación post-implementación

- Smoke: tabs conmutan y tooltips aparecen con red desactivada (CSS, sin red/JS); command filtra al teclear; `esc` limpia.
- El único `<script>` del fichero es el filtro command (≤10 líneas vanilla), declarado en comentario.

## Open questions (evolución futura)

- ¿command como componente reutilizable en `components.html`? ¿tabs reemplazan el filtro radio del glance? — diferido.

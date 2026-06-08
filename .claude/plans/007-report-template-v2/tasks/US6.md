---
us: US6
title: Galería de componentes shadcn (badges/alert/separator/progress/skeleton/empty-state)
wave: extra
depends_on: [US1]
tdd_mode: optional
estimate: M
status: closed
absorbs_decision: scope-extra-shadcn
---

# US6 — Galería de componentes shadcn

> **Scope-extra ratificado 2026-06-03.** Deliverable = `smoke-components-shadcn.html` como **referencia canónica** de los componentes. El horneado fino a `components.html` + cableado en glance/decision queda como **evolución futura** (decisión explícita del usuario: "ya iremos evolucionándolo"). Esta HU se cierra contra el showcase, no contra components.html.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Depends on** | [US1] (token block dark) |
| **Files touched** | `.claude/plans/007-report-template-v2/smoke-components-shadcn.html` (referencia) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Decisión absorbida** | scope-extra shadcn |

## User story

- **As a**: Oriol componiendo reportes/decisiones
- **I want**: una galería de piezas shadcn (badges, alert, separator, progress, skeleton, empty-state)
- **So that**: cubrir más tipos de contenido sin improvisar por generación

## Acceptance criteria

- **AC1**: Given el showcase, when se abre, then renderiza badges (4 variants), alert (info/warn/err), separator, progress (3), skeleton, empty-state — self-contained, **0 JS**.
- **AC2**: Given cada componente, when se inspecciona, then usa los tokens dark canónicos + anti-slop (sin gradientes purple, color=info, tinted neutrals).
- **AC3**: Given motion (skeleton shimmer), when `prefers-reduced-motion`, then no anima.

## Files

| Path | Cambio |
|---|---|
| `smoke-components-shadcn.html` | Referencia canónica de los componentes (entregado) |

## Verificación post-implementación

- Smoke: showcase renderiza offline; `Grep '<script'` en la galería (excluyendo el bloque command de US7) → 0 en la sección galería.
- Anti-slop 0 fallos.

## Open questions (evolución futura)

- Hornear a `templates/components.html` + cablear en glance/decision (diferido por decisión del usuario).

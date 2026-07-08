---
us: US3
title: learning-inbox saneado — captura sin ruido + gitignore vía project-onboard + split con auto-memory
wave: W1
depends_on: []
tdd_mode: forced
estimate: M
status: closed
closed: 2026-07-08
---

# US3 — Cluster learning-inbox (RI-2 + CG-08 + fricción de ruido)

## Execution prompt (Phase 3 input)

**Task**: Sanear la captura de `hooks/learning-inbox.ts` (3 defectos de clase: truncado mid-word en `slice(0, CONTEXT_MAX)`, sin suelo de confianza global, contenido JSON/transcript-crudo entra como "learning"), añadir la propuesta de `.claude/learned/` al gitignore que project-onboard genera, y documentar en el header del hook el split con la auto-memory nativa.
**Context**: learning-inbox.ts:73-89 (slice + SIGNALS con confidence por señal + REVIEW_PROSE solo filtra error-resolution). Evidencia de ruido: retros de binora/cv ("JSON truncado a confianza 0.4-0.5"). Split ratificado en auditoría (CG-08 verdict KEEP): auto-memory posee el recall cross-sesión; inbox.md posee los candidatos retro-ratificables. Suite existente: `hooks/__tests__/learning-inbox.test.ts`.
**Constraints**: `tdd: forced` — tests rojos primero para las 3 clases de ruido (fixture con captura legítima que DEBE pasar + 3 fixtures de ruido que DEBEN filtrarse). Sanear, NO reescribir (out-of-scope del spec). Umbral de confianza: decidir leyendo los valores reales de SIGNALS (open question 1) y fijarlo en el test.
**Deliverable**: hook saneado + tests nuevos; project-onboard propone `.claude/learned/` en gitignore; header del hook con el split documentado.
**Verify**: red→green; suite completa verde; grep del gitignore proposal en project-onboard.
**Ask first**: nada — decisiones bloqueadas; el umbral es dato-dirigido.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Wave / Deps** | W1 / none |
| **Files** | hooks/learning-inbox.ts, hooks/__tests__/learning-inbox.test.ts, skills/project-onboard/SKILL.md |
| **TDD** | **forced** |
| **Cómo arrancar** | Leer hook completo + valores SIGNALS → tests rojos de las 3 clases de ruido |

## Acceptance criteria

- **AC1**: Given fixtures de ruido (mid-word / confianza < suelo / JSON crudo), when corre la captura, then no entran al inbox; given captura legítima, then entra (spec AC3).
- **AC2**: Given project-onboard, when propone gitignore, then incluye `.claude/learned/`.
- **AC3**: Given el header del hook, then el split con auto-memory está escrito (auto-memory=recall; inbox=retro-ratificable).

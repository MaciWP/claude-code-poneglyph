---
us: US8
title: Memorias + wording version-specific
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: S
status: closed
absorbs_decision: AC9-version + reconciliar-memoria
---

# US8 — Memorias + wording version-specific

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | [US10] |
| **Files touched** | memory `independent-reviewer-when-self-assessing.md`, `agent-usage-minimalism.md`, `MEMORY.md`; wording "GA"→v2.1.154+ donde aplique |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | Read las 2 memorias + línea MEMORY.md; reconciliar con la política |
| **Decisión absorbida** | AC9 (version) + condición-dura (reconciliar memoria que contradice) |

## User story

- **As a**: mantenedor del sistema de memoria
- **I want**: que ninguna memoria contradiga la política y que el wording de versiones esté verificado
- **So that**: el sistema no recuerde "delegar a reviewer (Opus)" tras haberlo cortado

## Acceptance criteria

- **AC1** (condición dura): Given `independent-reviewer-when-self-assessing.md`, when se lee, then **ya no instruye "spawn independent reviewer agent (Opus)" / "Phase 4 MUST delegate to reviewer agent"**; reformulada al patrón **panel-review ≥4** (US6) — preserva la lección (autor≠evaluador) con el nuevo mecanismo.
- **AC2**: Given `MEMORY.md`, when se lee la línea de índice de esa memoria, then refleja el nuevo enfoque (panel-≥4, no "reviewer Opus").
- **AC3**: Given `agent-usage-minimalism.md`, when se lee, then alineada al árbol final (1=prohibido, ≥4, `Explore`-excepción).
- **AC4** (spec AC9): Given wording version-specific (donde aparezca "GA" pelado para workflows), then "req v2.1.154+"; teams citan `#24316`/`#31977`.

## Files a crear / a modificar

| Path | Cambio |
|---|---|
| `…/memory/independent-reviewer-when-self-assessing.md` | Reformular: lección (autor≠evaluador) intacta; mecanismo → panel-review ≥4 (no reviewer Opus único). Actualizar `description:` frontmatter |
| `…/memory/MEMORY.md` | Línea de índice de esa memoria → nuevo enfoque |
| `…/memory/agent-usage-minimalism.md` | Alinear wording al árbol |
| (wording "GA" version-specific donde aparezca) | "v2.1.154+" + `#24316`/`#31977` |

> Ruta memorias: `C:\Users\Oriol\.claude\projects\E--PYTHON-claude-code-poneglyph\memory\`

## Workflow detallado

1. Read las 2 memorias + línea MEMORY.md.
2. Reformular `independent-reviewer…`: conservar "autor=evaluador → sesgo"; cambiar mecanismo a panel-≥4 + `advisor()`. (Verificar coherencia con US6 doc-wiring).
3. Actualizar línea MEMORY.md.
4. Alinear `agent-usage-minimalism.md` al árbol.
5. `Grep "\bGA\b"` en docs version-specific tocados (orchestrator/complexity) → "v2.1.154+".

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Wording version verificado (junio 2026) |
| IX | Memoria coherente con la política — no recuerda lo cortado |
| X | Sin contradicción memoria↔sistema |

## Verificación post-implementación

- `Grep "reviewer agent (Opus)|MUST delegate to .reviewer" independent-reviewer…md` → 0.
- `Grep "panel"` en esa memoria → presente.

## Open questions

- ¿La memoria conserva la mención a `advisor()` como segunda capa? Sí (sigue válida, ortogonal al corte).

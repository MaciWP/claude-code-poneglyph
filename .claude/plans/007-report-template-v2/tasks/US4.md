---
us: US4
title: decide reusa el sistema html-report (no memo.html aislado)
wave: W3
depends_on: [US3]
tdd_mode: optional
estimate: S
status: closed
absorbs_decision: OQ1-decide-reusa-sistema
---

# US4 — decide reusa el sistema html-report

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W3 |
| **Depends on** | [US3] |
| **Blocks** | none |
| **Files touched** | `.claude/skills/decide/SKILL.md`; `.claude/skills/decide/templates/memo.html` (nota deprecación/pointer) |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | Editar `decide/SKILL.md` Step 4 para generar vía `html-report/templates/decision.template.html` |
| **Decisión absorbida** | OQ1 — un solo sistema visual; no duplicar |

## User story

- **As a**: mantenedor del meta-sistema (Oriol)
- **I want**: que `decide` use el mismo sistema de plantillas que `html-report`
- **So that**: haya un solo lenguaje visual y doctrina (Cmd X), no un `memo.html` divergente

## Acceptance criteria

- **AC1**: Given `decide/SKILL.md` Step 4, when se ejecuta `/decide`, then genera el HTML usando `html-report` `decision.template.html` (no su `memo.html` aislado).
- **AC2**: Given la doctrina visual, when se revisa, then NO se duplica el corpus de taste/tokens entre decide y html-report (Cmd X).
- **AC3**: Given `memo.html`, when se decide su destino, then se deprecia con pointer al sistema o se conserva como fallback offline — decisión documentada (Open question #1).
- **AC4**: Given `/decide` end-to-end, when corre, then sigue funcionando (3 perspectivas → síntesis → HTML decisión) sin regresión.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/decide/SKILL.md` | Step 4 apunta a `html-report` decision template; nota de reuso (no doctrina propia) |
| `.claude/skills/decide/templates/memo.html` | Cabecera: deprecado → usar sistema html-report (o marcado fallback), según decisión |

## Workflow detallado

1. Leer `decide/SKILL.md` Step 4 (delega a builder con memo.html).
2. Reescribir para que el builder rellene `html-report/templates/decision.template.html` con perspectivas + síntesis.
3. Decidir destino de memo.html (deprecate-pointer vs fallback) y documentarlo.
4. Smoke `/decide "<pregunta de prueba>"` → memo de decisión en el nuevo sistema.

## Commandments cubiertos

| # | Cómo |
|---|---|
| X | Un solo sistema de plantillas; elimina doctrina duplicada |
| III | Reuso antes que mantener dos sistemas |

## Reutiliza

- US3 `decision.template.html`.

## Verificación post-implementación

- Smoke: `/decide` produce HTML vía decision.template, sin regresión del flujo de 3 perspectivas.
- `bun test ./.claude/hooks/` sigue verde.

## Open questions (a resolver en implementación)

- Destino final de `memo.html` (borrar vs fallback) — decidir al ver el encaje.

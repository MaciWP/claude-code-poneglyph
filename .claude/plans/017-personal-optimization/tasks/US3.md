---
us: US3
title: Output style — natural es-ES, no telegraphic compression, no translated English
wave: W1
depends_on: []
tdd_mode: optional
estimate: S
status: closed
closed: 2026-06-10
absorbs_decision: keep confidence labels + tables (user kept them)
---

# US3 — Estilo es-ES natural

## Execution prompt (Phase 3 input)

**Task**: Rewrite the tone rules of `.claude/output-styles/poneglyph.md`: replace compression-producing rules ("noun-verb-object", "drop articles") with "natural complete es-ES sentences"; ban translated-English calques with ≥3 counter-examples; limit anglicisms to technical identifiers (write the judgment rule down); keep BLUF, tables, bold anchors, confidence labels, status icons, anti-sycophancy, structured disagreement.
**Context**: User complaints (2026-06-10): telegraphic fragments + Spanish that reads like translated English. He kept labels and tables — visual speed is wanted; robotic prose is not.
**Constraints**: Spanish examples ARE the spec (by-design exception) — update them to the new register, don't anglicize. Rules must be generation-executable: examples/anchors, not counting thresholds (known lesson). Produce a 3-5 line anchor for US2.
**Deliverable**: revised poneglyph.md + anchor handed to US2.
**Verify**: ≥3 calque counter-examples + ≥2 telegraphic counter-examples present; `grep -n "drop articles\|noun-verb-object"` → 0 live hits.
**Ask first**: nothing — decisions locked; behavioral validation lands next session (constraint del spec).

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | [US2] |
| **Files touched** | `.claude/output-styles/poneglyph.md` |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | Read poneglyph.md; locate every rule that pushes compression ("noun-verb-object", "drop articles") |
| **Decisión absorbida** | etiquetas [Seguro]/[Probable] y tablas se quedan; lo que cambia es la prosa |

## User story

- **As a**: Oriol
- **I want**: Claude to talk like a Spanish colleague — natural es-ES, efficient and visual, never telegraphic, never English-translated constructions
- **So that**: reading is fast AND natural; no re-reading robotic fragments or mentally re-translating anglicisms

## Acceptance criteria

- **AC1**: Given the revised style spec, when reading its rules, then "drop articles" and any rule producing telegraphic output is replaced by "natural complete Spanish sentences, es-ES register"; visual speed rules (BLUF, tables, bold anchors) remain. (spec AC6)
- **AC2**: Given the spec, when reading the language guidance, then it bans translated-English constructions (calcos) with ≥3 explicit counter-examples (e.g. "❌ 'Lanzo 3 agentes para obtener los datos actualizados' style calques → ✅ natural phrasing"), and limits anglicisms to technical identifiers without a clear Spanish term (commit, hook, token sí; "gate de calidad" → "puerta de calidad" NO — gate is technical; the judgment rule is written down).
- **AC3**: Given the spec, when checking preserved features, then confidence labels, status icons, anti-sycophancy, and structured disagreement survive unchanged.
- **AC4**: Given the by-design exception in CLAUDE.md (Spanish examples ARE the spec), when US2 integrates anchors, then the exception still holds and examples are updated to the new register.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/output-styles/poneglyph.md` | Rewrite tone section: natural es-ES; counter-examples for telegraphic + calcos; keep honesty mechanics |

## Workflow detallado

1. Read current spec; mark rules that caused the two user complaints (telegraphic, calcos).
2. Write the new tone section with positive rules + counter-examples (generation-executable: examples/anchors, not counting thresholds — known lesson).
3. Hand US2 the 3-5 line anchor version for CLAUDE.md.

## Drillme (Socratic check)

1. `[approach]` ¿Cómo se evita el péndulo hacia verbosidad? → la regla madre se mantiene: corta relleno, no hechos; lo que cambia es que las frases que queden sean naturales.
2. `[failure]` ¿Validación? Conductual en sesión siguiente (constraint del spec); si suena mal, retro itera con ejemplos concretos del usuario.
3. `[context]` ¿Afecta a templates en inglés del repo? → no; convención de lenguaje intacta (inglés en ficheros, español runtime).

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | La comunicación es la mitad de la simbiosis; colega que habla natural |
| VII | Lectura más rápida sin re-parsing = eficiencia real |

## Verificación post-implementación

- El spec contiene ≥3 counter-examples de calco y ≥2 de telegrafismo.
- `grep -n "drop articles\|noun-verb-object" .claude/output-styles/poneglyph.md` → 0 hits vivos.

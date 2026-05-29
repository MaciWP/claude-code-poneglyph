---
us: US7
title: Ensamble report final con progressive disclosure + honestidad radical
wave: W4
depends_on: [US4, US5, US6]
tdd_mode: skip
estimate: M
status: closed
absorbs_decision: progressive-disclosure-AC6-AC8
---

# US7 — Ensamble report final con progressive disclosure + honestidad radical

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W4 |
| **Depends on** | [US4, US5, US6] |
| **Blocks** | [] (último de Phase 3) |
| **Files touched** | `report.md` (crear — DELIVERABLE FINAL) |
| **TDD-mode** | skip: validations.md = oracle |
| **Estimate** | M (1 sesión — composición) |
| **Cómo arrancar** | Read TODOS los `build/*.md` (inventory, corpus, rubric, scoring, cross-analysis, findings); componer con progressive disclosure |
| **Decisión absorbida** | AC6 progressive disclosure + AC8 honestidad radical + disputa/rebuttal protocol |

## User story

- **As a**: Oriol
- **I want**: un report.md final profesional con progressive disclosure (legible en 5 min para decision, deep dive opcional) y honestidad radical
- **So that**: las decisiones post-audit (qué `/flow` priorizar) se toman rápido sin sacrificar fundamentación

## Acceptance criteria

- **AC1**: Given los 6 artefactos build/ (`inventory.md`, `corpus.md`, `rubric.md`, `scoring.md`, `cross-analysis.md`, `findings.md`), when se ensambla `report.md`, then todas las secciones críticas están presentes en orden de progressive disclosure:
   1. **Executive summary** (≤5 bullets, ≤200 palabras)
   2. **Top-10 hallazgos** (tabla US6)
   3. **Quick-wins** (tabla aparte si existe)
   4. **Scoring por categoría** (tabla compacta + link a sub-secciones detalladas)
   5. **Cross-analysis** (3 listas resumidas)
   6. **Rúbrica usada** (anchors literales 14 cat)
   7. **Inventario detallado** (compacto)
   8. **Corpus / Bibliografía** (12-20 fuentes verified)
   9. **Apéndice: limitaciones del audit** (sesgo meta-circular, apples-to-oranges, otros)
- **AC2**: Given el report final, when se cierra, then target 2500-4500 palabras (rango óptimo lectura+detalle). Si excede 4500 → mover sub-detalles a apéndice. Si <2500 → contenido demasiado superficial, retry.
- **AC3**: Given AC8 spec (honestidad radical), when el report se cierra, then incluye OBLIGATORIO ≥1 hallazgo crítico negativo concreto sobre el propio sistema. Si literalmente no existe (post AC5 checks en US4+US6) → declarar explícitamente "Sistema sin hallazgo crítico negativo identificado tras AC5 honestidad checks; verdict reviewer Opus Phase 4 confirmará/refutará".
- **AC4**: Given disputa/rebuttal protocol (refinement absorbed), when frontmatter del report se redacta, then incluye campo `disputed: []` editable por Oriol para marcar hallazgos en disputa sin re-ejecutar audit.
- **AC5**: Given Commandment II, when se cita cualquier fuente externa, then formato `[FuenteNombre](URL)` (verified en US2). Citas internas: `path:linea` o `path` (Windows path con forward-slash para markdown).
- **AC6**: Given AC1 (progressive disclosure), when un lector lee solo las secciones 1-3 (executive + top-10 + quick-wins), then tiene contexto suficiente para decidir próximos 3 `/flow`. Test: pídele a un lector externo (Phase 4 reviewer Opus) confirmar.
- **AC7**: Given report.md final, when se persiste, then frontmatter incluye: `audit_date`, `commit_sha` (HEAD del audit), `mean_score`, `findings_count`, `corpus_size`, `disputed: []`, `meta_circular_limitations_declared: true`.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/plans/002-claude-config-deep-audit/report.md` | DELIVERABLE FINAL — report markdown progresivo |

## Workflow detallado

1. Read los 6 artefactos `build/*.md`. Verificar completos y AC pasados en sus respectivos US.
2. **Section 1 — Executive Summary** (≤5 bullets, ≤200 palabras):
   - Bullet 1: scope del audit + métodos
   - Bullet 2: mean score + distribución
   - Bullet 3: BLOCKER finding más relevante (o "ningún BLOCKER")
   - Bullet 4: top opportunity (MAJOR severity)
   - Bullet 5: limitación principal del audit (sesgo meta-circular o apples-to-oranges)
3. **Section 2 — Top-10 hallazgos** (tabla US6 verbatim).
4. **Section 3 — Quick-wins** (tabla US6 separada si existe).
5. **Section 4 — Scoring por categoría** (tabla compacta: `Categoría | Score | Justificación 1-line | Link al detalle`).
6. **Section 5 — Cross-analysis** (3 listas con bullets compactos; full en US5 link).
7. **Section 6 — Rúbrica usada** (las 14 cat × 3 anchors literales, compacto).
8. **Section 7 — Inventario detallado** (counts por categoría + tabla compacta; full en US1 link).
9. **Section 8 — Corpus** (lista 12-20 fuentes con URL + `compare-context` label).
10. **Section 9 — Apéndice: limitaciones**:
    - Sesgo meta-circular declarado (capas 1-5 mitigación)
    - Apples-to-oranges del corpus (asumido por usuario)
    - Score paralysis risk de 14 categorías (mitigado por progressive disclosure)
    - Audit-first vs dogfood-first trade-off (asumido)
    - Cualquier otra limitación encontrada
11. Verificar AC3 honestidad radical: ≥1 hallazgo negativo crítico o declaración explícita.
12. Verificar AC2 word count: 2500-4500.
13. Frontmatter completo (AC7).
14. Verify final: cada URL externa verified en corpus.md; cada path interno verified en inventory.md.

## Drillme (Socratic check)

| Categoría | Pregunta |
|---|---|
| `[location]` | ¿Apéndice de limitaciones al final o al principio? Final — lector que llega ahí ha visto el contenido; al principio sería defensive framing. |
| `[approach]` | ¿Composición lineal o template-driven? Template-driven con AC1 ordering. Lineal sin estructura = riesgo de sección perdida. |
| `[context]` | ¿Cómo manejar referencias entre secciones (e.g., top-10 finding #3 cita score categoría X)? Anchor markdown `[#scoring-categoria-X]`; verify links activos. |
| `[failure]` | ¿Qué pasa si AC3 trigger se activa (no hay finding negativo)? Documentar explícitamente; NO inventar finding. Verdict de reviewer Opus Phase 4 confirma honestidad. |

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | AC3 honestidad radical = ≥1 negative concreto o declaración explícita |
| II | AC5 anti-hallucination en cada cita; verify links activos |
| III | Progressive disclosure = report útil sin leer entero; cap word count evita bloat |
| IV | AC1 estructura obligatoria + AC6 test de progressive disclosure |
| V | Apéndice limitaciones = honestidad sobre alcance |
| X | Disputa/rebuttal protocol (AC4) = mantenibilidad para audits futuros |

## Reutiliza

- `anti-hallucination` skill — per cita
- Pattern de `retro.md` de 001 para tablas densas + secciones

## Adaptación intra-fase

| Señal | Adaptación |
|---|---|
| Word count <2500 al primer ensamble | Add detalle en secciones 4, 5, 7; nunca pad executive summary |
| Word count >4500 | Mover sub-detalles de secciones 4-7 a apéndice nuevo `report-appendix.md` |
| AC3 trigger (no negative finding) | NO inventar; declarar explícitamente + flag verdict reviewer Opus |

## Smell signals

- ⚠️ Executive summary excede 5 bullets → simplify
- ⚠️ Sección 9 (limitaciones) vacía → falsa modestia o falta crítica
- ⚠️ Top-10 con findings sin /flow command sugerido → fallo de US6 propagado; retry US6
- ⚠️ Link interno roto (anchor inexistente) → fix antes de cerrar

## Verificación post-implementación

- Smoke: 9 secciones presentes en orden AC1.
- Word count entre 2500-4500.
- Frontmatter con 7 campos AC7.
- AC3 verdict: hallazgo negativo concreto O declaración explícita.
- Lectura solo de secciones 1-3 → comprende top decisiones (AC6 test).

## Open questions (a resolver en implementación)

- ¿Apéndice "limitaciones" debe sugerir mitigaciones para audit-2 futuro? Sí — convertir cada limitación en learning para próximo audit.
- ¿Report debe linkear al state.json para reproducir contexto? Sí — `state.json` cita en frontmatter como `audit_context: state.json`.

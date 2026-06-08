---
us: US1
title: output-style poneglyph.md — honesty mechanics + terseness tightening
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: closed
approved: 2026-06-08
closed: 2026-06-08
absorbs_decision: placement-mechanics-to-output-style
---

# US1 — output-style: honesty mechanics + terseness tightening

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | `none` |
| **Blocks** | `none` (US2 referencia nombres canónicos, pero no bloquea) |
| **Files touched** | `.claude/output-styles/poneglyph.md` |
| **TDD-mode** | optional (validation-mode: lectura + grep) |
| **Estimate** | M |
| **Cómo arrancar** | `Read .claude/output-styles/poneglyph.md`; añadir secciones "Honesty mechanics" + tightening de "Tone — what to strip" |
| **Decisión absorbida** | placement: mecánica/tono → output-style |

## User story

- **As a**: Oriol (y cualquier proyecto que use poneglyph style)
- **I want**: que el output-style codifique la mecánica de honestidad (kill-list bilingüe, labels default-seguro, formato de discrepancia) y afine la terseness
- **So that**: cada respuesta gaste menos tokens y transmita hechos vs suposiciones con señal explícita, sin saturar

## Acceptance criteria

- **AC1 (kill-list bilingüe)**: Given el output-style, when se redacta, then incluye una sección "Anti-sycophancy" con kill-list ES+EN ("buena pregunta"/"great question", "tienes toda la razón"/"you're absolutely right", "tiene mucho sentido"/"makes total sense", "por supuesto"/"of course", "sin duda", "claro/vale/perfecto", "excellent") + regla: bórralas y reescribe si aparecen (auto-corrección, spec AC9).
- **AC2 (label convention default-seguro)**: Given el output-style, then define convención: prosa técnica sin etiqueta = baseline verificada `[Seguro]`; solo se marca `[Probable]` (inferencia fuerte) o `[Suposición]` (relleno de hueco); **agrupable por bloque** (un label cubre un cluster). (spec AC2)
- **AC3 (formato discrepancia)**: Given el output-style, then documenta el patrón "No estoy de acuerdo porque [razón]. Yo haría [alternativa]. El riesgo de tu enfoque es [consecuencia]" + "verdad incómoda primero, sin párrafo de calentamiento" + umbral: solo en desacuerdo genuino/consecuente, no en prefs triviales. (spec AC3)
- **AC4 (terseness afinada)**: Given la sección "Tone — what to strip", when se actualiza, then añade reglas de afinado (menos burocracia, "lo justo para que se entienda y dé valor") y actualiza la nota de reducción (ya no "~5-10%"; refleja el nuevo objetivo) preservando hard-preserves (código/datos verbatim) y el escape pedagógico.
- **AC5 (no rompe escape-hatches)**: Given la sección "Overrides", then se preserva intacta (modo pedagógico `/explain`, "enséñame").
- **AC6 (bloque de ejemplos)**: Given el output-style, then incluye un bloque before/after (estilo "Tone — examples") mostrando la honestidad en acción: peloteo→directo, claim sin label→con `[Probable]`/`[Suposición]`, acuerdo reflexivo→discrepancia estructurada. El wording del protocolo se valida con `prompt-engineer` (también aplica a US2).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/output-styles/poneglyph.md` | +sección "Honesty mechanics" (kill-list, labels default-seguro, formato discrepancia, auto-corrección); afinar "Tone — what to strip"; actualizar nota de reducción; preservar "Overrides" + "Tone — hard preserves" |

## Workflow detallado

1. `Read` el fichero actual (97 líneas).
2. Insertar nueva sección "## Honesty mechanics" tras "Tone — hard preserves": kill-list bilingüe + label convention default-seguro + formato discrepancia + auto-corrección. Terse, en tablas.
3. Afinar "Tone — what to strip" con la regla de calibración del usuario (lo justo, sin burocracia).
4. Actualizar la nota final de "Activation" (la métrica "~5-10%" → reflejar objetivo afinado; honesto: no inventar % nuevo, decir "objetivo: recortar relleno preservando valor").
5. Verificar que "Overrides" (pedagogía) y "Tone — hard preserves" quedan intactos.
6. Usar canon de `meta-settings-cookbook` (output-style format) durante la edición.

## Drillme (Socratic check)

1. `[location]` ¿La mecánica de tono va en output-style y NO en CLAUDE.md? — Sí: CLAUDE.md lleva el comportamiento/valores; output-style la mecánica de superficie.
2. `[approach]` ¿Label default-seguro vs etiquetar todo? — default-seguro: minimiza ruido, cumple "agrupar" del usuario; etiquetar todo = cargo-cult (spec rechaza).
3. `[context]` ¿Choca con "Tone — what to strip" (que ya prohíbe "claro/vale/perfecto")? — Se consolida: la kill-list amplía y unifica esa regla, no la duplica.
4. `[failure]` ¿Y si el usuario apaga el output-style (`/output-style Default`)? — La honestidad-comportamiento sigue viva en CLAUDE.md (US2); solo se pierde la mecánica de tono. Aceptable.

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Anti-pelota + discrepancia estructurada = honestidad operativa |
| II | Labels separan hecho verificado de suposición |
| III | Terseness afinada; label default-seguro evita ruido |
| VII | Menos relleno = menos tokens |

## Reutiliza

- `meta-settings-cookbook` — canon de formato de output-style.

## Verificación post-implementación

- `grep -i "anti-sycophancy\|\[Suposición\]\|No estoy de acuerdo porque" .claude/output-styles/poneglyph.md` → match.
- Lectura: "Overrides" pedagógico intacto; "hard preserves" intacto.
- `bun test ./.claude/hooks/` sigue pasando (no toca hooks).

## Open questions (a resolver en implementación)

- Wording exacto de equivalentes EN del kill-list (se fija al redactar).

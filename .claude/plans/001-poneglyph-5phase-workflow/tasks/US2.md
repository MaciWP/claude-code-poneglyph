---
us: US2
title: Skill `scope` (Fase 1) — sin command wrapper
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: approved
approved: 2026-05-28
---

# US2 — `scope` skill + `/scope` command (Fase 1)

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 (paralelo con US3-US7) |
| **Depends on** | US1 (estructura + templates) |
| **Blocks** | US8 (`/flow` necesita esta skill) |
| **Files touched** | crear `.claude/skills/scope/SKILL.md` (sin wrapper command — skill se invoca como `/scope` directo per docs Anthropic 2026) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Read `templates/spec.template.md` (de US1) → escribir SKILL.md con frontmatter + workflow + drillme |
| **Decisión absorbida** | — |

## User story

- **As a**: developer con una petición vaga o multi-dimensional
- **I want**: una skill auto-activable que defina el alcance desde el punto de vista de producto (no técnico) ANTES de cualquier implementación
- **So that**: nunca arranco la fase técnica sin un "qué/por qué" claro, y evito over-engineering por mala interpretación del problema

## Acceptance criteria

- **AC1**: Given una petición ambigua con keywords `scope` / `idea` / `problema` / `alcance` / `quiero` / `necesito`, when el Lead procesa el prompt, then la skill `scope` se auto-activa via `description`.
- **AC2**: Given la skill activa, when no hay `spec.md` previo en el contexto, then ejecuta cuestionario intensivo (3-8 preguntas vía `AskUserQuestion`) hasta entender el alcance sin ambigüedad.
- **AC3**: Given el cuestionario completado, when aplica drillme con las 5 preguntas obligatorias del modelo V2, then cada una recibe respuesta documentada antes de cerrar.
- **AC4**: Given drillme cerrado, when produce el artefacto, then crea `.claude/plans/{NNN}-{slug}/spec.md` siguiendo `templates/spec.template.md` con frontmatter `mode`, `status: approved
approved: 2026-05-28`.
- **AC5**: Given complejidad declarada >60 por el Lead, when entra en modo `full`, then opcionalmente lanza 2-3 agentes producto en `background` (Outsider, User, Product — del catálogo de `decision-stress-test`); sus opiniones se incorporan al `spec.md` como sección "Voces externas".
- **AC6**: Given el `spec.md` producido, when la skill cierra, then reporta al usuario explícitamente: "spec.md lista en `<path>` — pendiente aprobación humana (hard gate 1→2)".
- **AC7**: Given el principio "no siempre más es más", when la petición ya viene con brief detallado, then reduce cuestionario a 1-3 preguntas críticas + salta drillme si las respuestas son auto-evidentes; declara en el spec.md: "Drillme reducido por contenido autoexplicativo".

## Files a crear

| Path | Contenido |
|---|---|
| `.claude/skills/scope/SKILL.md` | Skill markdown con frontmatter completo + workflow + drillme block + estructura output |
| `.claude/commands/scope.md` | Wrapper trivial: `$ARGUMENTS\n\nInvoke the scope skill.` con argument-hint `"<brief or question>"` |

## Frontmatter de la skill (exacto)

```yaml
---
name: scope
description: |
  Define product-level scope BEFORE any technical work. Generates spec.md
  through an intensive Q&A questionnaire + 5-question drillme. Identifies
  root problem (not symptom), success criteria, out-of-scope explicitly.
  Use when: vague request, new feature, undefined alcance, "necesito X",
  "quiero hacer Y", "el problema es Z". Auto-activates on phase-1 keywords.
  Keywords - scope, idea, problema, alcance, quiero, necesito, define,
  product, requirements, success criteria, what-why, before-implementing
disable-model-invocation: false
argument-hint: "<brief or question>"
---
```

## Workflow detallado de la skill (paso a paso)

1. **Detectar contexto** (Glob + Read):
   - ¿Existe `spec.md` en algún `.claude/plans/{NNN}-{slug}/`? Si sí, ¿está `status: approved
approved: 2026-05-28` (continuar) o `approved` (revisar si quiere nuevo feature)?
   - Si no hay nada → asignar próximo NNN y slug derivado de la petición.

2. **Cuestionario intensivo** (3-8 preguntas vía `AskUserQuestion`, una pregunta por turn o batch según UX testing):
   - Mínimo 3 preguntas; máximo 8.
   - Plantillas (adaptar a la petición concreta):
     - "¿Cuál es el problema concreto que quieres resolver, no la solución?"
     - "¿Quién sufre hoy y cómo se manifiesta?"
     - "¿Qué resultado mínimo te haría feliz?"
     - "¿Hay constraints técnicos/temporales que debamos respetar?"
     - "¿Hay alternativas que ya hayas descartado y por qué?"
   - Para cada pregunta ambigua respondida: agregar follow-up hasta clarificar.

3. **Drillme Fase 1** (las 5 obligatorias, **en orden**, antes de cerrar):
   - **Drill 1**: ¿Cuál es el problema raíz, no el síntoma? (5-whys lite)
   - **Drill 2**: ¿Qué pasa si NO lo hacemos? (test de severidad)
   - **Drill 3**: ¿Quién sufre hoy? (stakeholders implícitos)
   - **Drill 4**: ¿Cuál es el resultado mínimo viable? (MVP test)
   - **Drill 5**: ¿Qué NO está en alcance? (cierre de puertas — out-of-scope explícito)
   - Si alguna recibe respuesta vacía o ambigua → iterar con follow-up; NO cerrar la fase con drillme abierto.

4. **Si modo `full`** (complejidad >60 declarada por Lead):
   - Lanzar 2-3 agentes en background con perspectivas distintas:
     - **Outsider** (sin contexto del proyecto, primeros principios)
     - **User** (DX/UX del público objetivo)
     - **Product** (oportunidad de mercado / opportunity cost)
   - Esperar sus reportes; incorporar puntos no triviales como sección "Voces externas" del `spec.md`.
   - Decisión costo: ~3-5K tokens extra; activar solo en modo full por defecto.

5. **Producir `spec.md`**:
   - Read `templates/spec.template.md`.
   - Rellenar campos obligatorios: Problema, Resultado esperado, Success criteria (Given/When/Then), Out-of-scope, Constraints (si aplica), Stakeholders (si >1).
   - Crear `.claude/plans/{NNN}-{slug}/spec.md` con frontmatter `mode: <minimal|standard|full>`, `status: approved
approved: 2026-05-28`.
   - Anti-hallucination: no inventar AC; cada AC viene del cuestionario o del drillme.

6. **Reportar al usuario**:
   - Path del `spec.md`.
   - Resumen 2-3 líneas: "Definí scope: problema X, resultado Y, N AC."
   - Indicación explícita: "Hard gate 1→2 — necesito tu aprobación antes de pasar a planificación técnica."

## Drillme block (literal para copiar en el SKILL.md)

```markdown
## Drillme — Phase 1

Before closing this phase, the following questions must have explicit answers (in spec.md):

1. **Root problem?** What is the root cause, not the symptom? Apply 5-whys if needed.
2. **What if we don't?** Severity test: what happens if we skip this work entirely?
3. **Who suffers today?** Implicit stakeholders — who feels the problem now?
4. **MVP outcome?** What's the minimum viable result that resolves the core pain?
5. **Out of scope?** Close doors explicitly. What is NOT included.

If any answer is vague or empty → iterate with follow-up. Do NOT close phase 1 with open drillme questions.

> **For full Socratic check, invoke the `drillme` skill** (US11 — `.claude/skills/drillme/SKILL.md`). The 5 questions above are phase-specific; drillme provides the canonical 4-category catalog (`[location]`/`[approach]`/`[context]`/`[failure]`) + complementary patterns (5-whys, first principles, inversion). Do NOT duplicate the canon here.
>
> Skill→skill invocation is probabilistic — if drillme does not auto-fire, the Lead invokes `/drillme "Phase 1 closing for <NNN-slug>"` manually before approving the hard gate 1→2.
```

## SIEMPRE rules implementadas

- **Cuestionario intensivo** (mínimo 3 preguntas hasta entender alcance sin ambigüedad).
- **Proactividad sobre gaps**: si detecta mejoras al alcance propuesto o gaps obvios → los menciona ANTES de cerrar (no asume).

## Commandments cubiertos

| # | Cómo se cumple |
|---|---|
| I (honest) | Pregunta cuando no sabe; no inventa intent del usuario |
| II (factual) | Verifica premisas factuales (ej. "¿X existe ya?") antes de incluirlas en spec |
| III (simple) | Drillme detecta over-scope y fuerza out-of-scope explícito |
| V (understand) | Fase entera es "entender antes de actuar" |
| VIII (meta-prompting) | Cuestionarios estructurados según template |

## Reutiliza (NO se modifica)

- `prompt-engineer` (opcional, si prompt original muy vago — para refinar ANTES del cuestionario).
- `anti-hallucination` (verificación de premisas factuales que el usuario menciona).
- `AskUserQuestion` (mecánica de cuestionario).
- `decision-stress-test` (opcional, modo `full` — para los 2-3 agentes producto en background).

## Adaptación intra-fase (Principio 2 — "no siempre más es más")

| Señal en petición | Adaptación |
|---|---|
| Brief detallado del usuario (con problema, resultado, AC ya redactados) | Cuestionario 1-3 preguntas críticas; drillme reducido si respuestas auto-evidentes |
| Petición trivial (typo, rename, 1-2 archivos) | Skill probablemente NO se activa (triaje del Lead la salta a Fase 3 directa) |
| Petición arquitectural multi-dominio | Cuestionario 6-8 preguntas + drillme completo + agentes producto background |

Adaptación se declara honestamente en `spec.md` ("Drillme reducido: motivo...").

## Casos edge a manejar

- **Edge 1**: Usuario abandona el cuestionario a mitad (sesión cerrada) → `state.json` permite reanudar; `spec.md` queda con `status: approved
approved: 2026-05-28` parcial.
- **Edge 2**: Drillme genera respuesta "no sé / no aplica" en una pregunta → marcar como `[OPEN]` en el spec, no cerrar la pregunta artificialmente.
- **Edge 3**: Usuario contradice respuesta previa → reabrir esa sección, no incluir respuestas inconsistentes.
- **Edge 4**: La petición es ambigua entre dos features distintas → cerrar como 2 spec.md separados (NN y NN+1) o pedir al usuario que priorice.

## Smell signals

- ⚠️ Si el cuestionario excede 8 preguntas → la petición es probablemente 2 features distintas; sugerir split.
- ⚠️ Si drillme cierra todas con respuesta "no sé" → la petición no es ejecutable todavía; pedir más research previa del usuario.
- ⚠️ Si el `spec.md` queda con >5 Open questions → escalar a modo `full` aunque el Lead había estimado standard.

## Verificación post-implementación

- `bun test ./.claude/hooks/` sigue 81/81 (no toca código).
- Smoke: invocar `/scope "necesito hacer X"` → debe arrancar cuestionario.
- Smoke: invocar `/scope` sin args → pedir brief al usuario, no fallar silenciosamente.
- Verificar auto-activación: en prompt sin `/scope` pero con "necesito hacer X" → skill se auto-activa.

## Socratic categories (canonical mapping — research 2026-05-28)

El drillme de Fase 1 se mapea contra las **4 categorías canónicas** del [Socratic Prompt Method](https://blogs.jaseci.org/blog/2026/03/10/socratic-prompt-method/) (Jaseci Labs, 2026):

| Pregunta drillme | Categoría canónica | Etiqueta |
|---|---|---|
| Drill 1 — Root problem? | Challenge approach (5-whys → why this is the actual problem) | `[approach]` |
| Drill 2 — What if we don't? | Probe failure modes (severity test) | `[failure]` |
| Drill 3 — Who suffers today? | Introduce context (stakeholders implícitos) | `[context]` |
| Drill 4 — MVP outcome? | Challenge approach (minimum scope decision) | `[approach]` |
| Drill 5 — Out of scope? | Challenge location (cierre de puertas) | `[location]` |

**Cobertura**: 4/4 categorías ✅. Las 5 preguntas literales del drillme cubren las 4 dimensiones canónicas; al implementar el SKILL.md, añadir etiquetas `[categoría]` a cada drill para audibilidad.

## Open questions (a resolver en implementación)

- ¿`AskUserQuestion` en batch (todas las preguntas en uno) o uno a uno? Empírico — probar ambos modos.
- ¿Voces externas en modo `full` van en sección aparte o se integran en Problema/Constraints? Probablemente aparte para preservar atribución.

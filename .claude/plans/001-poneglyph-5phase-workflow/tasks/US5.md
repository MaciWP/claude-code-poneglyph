---
us: US5
title: Skill `build` + command `/build` (Fase 3) + decisión `builder` agent
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: approved
approved: 2026-05-28
absorbs_decision: builder agent (CUT / KEEP-cond / ABSORB)
---

# US5 — `build` skill + `/build` command (Fase 3)

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 (paralelo con US2-US4, US6, US7) |
| **Depends on** | US1 |
| **Blocks** | US8 |
| **Files touched** | crear `.claude/skills/build/SKILL.md` + `.claude/commands/build.md`; condicional sobre `builder` agent (ver AC7) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Read `tasks/index.md` + `state.json` → elegir siguiente HU → Read US{N}.md + tests T{N}.* → Glob ejemplos → red→green |
| **Decisión absorbida** | `builder` agent: CUT / KEEP-conditional (≥5 archivos) / ABSORB |

## User story

- **As a**: developer con `tasks/` + `tests.md` aprobados
- **I want**: una skill que tome UNA HU, lea contexto, busque ejemplos similares e implemente código minimal
- **So that**: cada HU cierra red→green (o skip-justified) antes de pasar a la siguiente, respetando el estilo del proyecto

## Acceptance criteria

- **AC1**: Given keywords `build` / `implementa` / `ejecuta` / `construye` + `tasks/` con HUs pendientes en `state.json`, when el Lead procesa, then `build` se auto-activa.
- **AC2**: Given command `/build US{id}`, when se invoca, then ejecuta esa HU específica (no la siguiente disponible).
- **AC3**: Given una HU con TDD-mode=forced y test asociado, when ejecuta, then escribe el test PRIMERO, lo ejecuta, verifica que falla (red) → implementa minimal → verifica que pasa (green).
- **AC4**: Given una HU con `tdd-skip: <reason>`, when ejecuta, then implementa código directo + ejecuta suite existente como verificación.
- **AC5**: Given duda concreta durante implementación (interfaz ambigua, decisión no en spec, edge case no cubierto), when surge, then invoca `AskUserQuestion` antes de improvisar.
- **AC6**: Given HU completada, when cierra, then actualiza `state.json` (HU completada, timestamp, tests passed) + reporta siguiente HU disponible.
- **AC7** (decisión absorbida): Given la skill operativa, when se compara con `builder` agent (existente en `.claude/agents/builder.md`), then se ejecuta UNA de tres acciones:
  - **CUT**: borrar `.claude/agents/builder.md` + purgar refs. Default si la skill cubre los casos en 1-4 archivos.
  - **KEEP-conditional**: mantener `builder` solo invocado por `build` cuando la HU implica **≥5 archivos OR cambio arquitectural** (context isolation justifica). El SKILL.md documenta el criterio.
  - **ABSORB**: contenido relevante de `builder.md` se migra al SKILL.md de `build`; agent se borra.

## Files a crear

| Path | Contenido |
|---|---|
| `.claude/skills/build/SKILL.md` | Skill markdown con frontmatter + workflow + drillme |
| `.claude/commands/build.md` | Wrapper con `argument-hint: "[US{id}]"` |

## Files condicionales (según decisión AC7)

| Path | Acción |
|---|---|
| `.claude/agents/builder.md` | CUT → borrar. KEEP-cond → mantener intacto. ABSORB → borrar tras migrar contenido. |
| `.claude/agent-memory/builder/MEMORY.md` | CUT → considerar borrar (memoria histórica). KEEP-cond → mantener. ABSORB → migrar insights útiles a memoria del Lead/skill. |
| Refs en CLAUDE.md, otros skills, rules | Update Grep + Edit |

## Workflow detallado

1. **Read** `tasks/index.md` + `tests.md` + `state.json` del directorio activo.
2. **Identificar HU a ejecutar**:
   - Si command pasó `US{id}` → esa.
   - Si no → primera HU pendiente sin deps abiertas (consultar `state.json.us_pending` × `depends_on` de cada HU).
3. **Read AC de la HU + test asociado** (`tasks/USX.md` + `tests.md` sección T{X}.*).
4. **Glob/Grep ejemplos similares** en el proyecto (preservar estilo).
5. **Si TDD-mode=forced y existe test node**:
   - Escribir test → ejecutar → verificar fallo (red).
   - Si pasa antes de impl: STOP, smell — confirmar con Lead.
   - Implementar minimal para pasar test (green).
   - Re-ejecutar test → verificar pase.
6. **Si `tdd-skip: <reason>` en la HU**: implementar directo + ejecutar suite existente.
7. **Si duda concreta surge**: `AskUserQuestion` con contexto + opciones. Nunca improvisar.
8. **Drillme intra-HU** (las 4):
   - **Drill 1**: ¿Existe un patrón en el proyecto que estoy ignorando?
   - **Drill 2**: ¿Mi implementación introduce duplicación?
   - **Drill 3**: ¿Hay sobre-ingeniería para el AC declarado?
   - **Drill 4**: ¿Los nombres son consistentes con el resto?
9. **Decisión sobre `builder` agent** (parte de AC7):
   - Si HU implica ≥5 archivos OR cambio arquitectural → considerar delegar a `builder` agent (si decisión = KEEP-cond).
   - Si HU es 1-4 archivos → ejecutar directo (sin delegar).
10. **Actualizar `state.json`**: HU completada, timestamp, tests passed.
11. **Reportar**: HU cerrada, siguiente disponible o cierre de Wave.

## Drillme block (literal)

```markdown
## Drillme — Phase 3 (intra-HU)

Before marking HU as completed:

1. **Pattern ignored?** Is there a pattern in the project I'm ignoring?
2. **Duplication?** Does my implementation introduce duplication?
3. **Over-engineering?** Am I adding more than the AC requires?
4. **Naming consistent?** Are names consistent with the rest of the codebase?

> **For full Socratic check, invoke the `drillme` skill** (US11). The 4 questions above are intra-HU (during implementation); drillme provides the canonical 4-category catalog when broader doubt arises. Do NOT duplicate the canon here.
>
> Skill→skill invocation is probabilistic — if drillme does not auto-fire and a real doubt blocks progress, the Lead invokes `/drillme "<concrete doubt>"` manually before continuing.
```

## SIEMPRE rules

- Si duda concreta → `AskUserQuestion`. Nunca improvisar.
- Glob/Grep ejemplos del proyecto antes de implementar.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Verifica módulos/funciones antes de importar |
| III | Drillme intra-HU detecta over-engineering |
| IV | Tests pasan antes de marcar HU completada |
| V | Lee contexto + ejemplos antes de escribir |
| VI | No expone secrets; respeta security |
| VIII | Pregunta si duda |

## Reutiliza

- `lsp-operations` (navegación semántica: findReferences, hover, goToDefinition).
- `anti-hallucination` (verificar antes de afirmar).
- `diagnostic-patterns` (si tests fallan).
- `review-patterns` (calidad mientras escribe — opcional).
- `builder` agent (condicional, según AC7).

## Decisión AC7 — análisis detallado

Auditoría a hacer en implementación:

| Dimensión | Pregunta |
|---|---|
| Uso histórico | Grep en transcripts ~/.claude/projects/ — ¿builder fue invocado? ¿con qué frecuencia? ¿en qué tipos de tareas? |
| Valor único | ¿builder hace algo que build no podría hacer directo? (probablemente: context isolation cuando ≥5 archivos contaminan el main context) |
| Coste | Delegar a builder = +1 context window = +tokens. Justificado solo si la HU lo requiere |
| Sin builder | ¿Las HUs típicas de poneglyph son 1-4 archivos? Sí (la mayoría) → CUT default razonable |

**Veredicto propuesto (a ratificar en implementación)**: **KEEP-conditional** — mantener builder pero solo invocado cuando HU ≥5 archivos OR cambio arquitectural declarado en `tasks/USX.md`. Criterio documentado en SKILL.md.

## Adaptación intra-fase

| Señal | Adaptación |
|---|---|
| HU trivial (1 archivo, patrón conocido) | Saltar Glob exhaustivo, ejemplos 1-2, drillme reducido a pregunta más relevante |
| HU arquitectural (≥5 archivos) | Considerar delegar a `builder` agent (si KEEP-cond) o split HU |
| HU con TDD-mode forced | Red→green estricto, no atajos |

## Casos edge

- **Edge 1**: HU con deps no cumplidas en `state.json` → STOP, ejecutar deps primero.
- **Edge 2**: Tests fallan tras impl → diagnostic-patterns → retry. Si 2+ retries fallan → escalar al usuario.
- **Edge 3**: HU completada pero AC no cubierto en práctica → mark `state.json` con flag `manual_review_needed`.

## Smell signals

- ⚠️ Si una HU requiere modificar archivos no listados en `files` del `tasks/USX.md` → smell, reabrir Fase 2 para refinar la HU.
- ⚠️ Si necesitas 2+ `AskUserQuestion` durante 1 HU → la HU estaba mal definida (atomicidad fallida).
- ⚠️ Si la implementación introduce duplicación (Glob lo detecta) → refactor antes de cerrar HU.

## Verificación post-implementación

- Smoke: invocar `/build US{N}` con tasks de ejemplo → ejecuta esa HU.
- Verificar `state.json` se actualiza correctamente.
- Si decisión AC7 = CUT: `Grep "builder" .claude/` retorna 0 matches (excepto históricos).

## Open questions (implementación)

- Si decisión AC7 = KEEP-cond: ¿el SKILL.md de build invoca `Agent(subagent_type=builder)` o el Lead lo invoca?
- Si CUT: ¿`agent-memory/builder/` se borra o se preserva como histórico?

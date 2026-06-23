---
us: US2
title: Hook skill-activation barato siempre-on — shortlist con motivos + nombra skill-advisor
wave: W2
depends_on: [US1]
tdd_mode: forced
estimate: M
status: closed
approved: 2026-06-23
---

# US2 — Hook skill-activation barato siempre-on

## Execution prompt (Phase 3 input)

**Task**: Evolucionar `.claude/hooks/skill-activation.ts` de "inyectar `Invoke Skill(X)`" a "inyectar un shortlist con motivos breves + nombrar `skill-advisor` de forma incondicional en tareas no triviales", y dejar de saltar `/goal` (procesar su tarea). Todo determinista, sin LLM.
**Context**: Hook actual en `.claude/hooks/skill-activation.ts` (función pura `processPayload` + `matchSkills` + `loadSkills`, ya testeada en `__tests__/skill-activation.test.ts`). PRIMERO resolver la open-question: ¿dónde aterriza el hint y por qué el Lead lo trata como advisory? — instrumentar con `console.error` temporal + correr `/goal x` en sesión viva, O documentar como `[Suposición]` si no se puede en esta sesión (memoria: behavioral-AC valida próxima sesión). El hook entrega la CONSIDERACIÓN (shortlist como contenido), no fuerza la llamada — esto es deliberado y verificado (no se puede forzar). `skill-advisor` (US1) ya existe → el nombre es válido.
**Constraints**: Sin coste LLM (solo lectura de heads, como hoy). Respetar el cap de líneas de inyección (≤5-6 líneas; hoy ≤5). NO re-introducir el force-load de orchestrator-protocol (anti-patrón ya revertido). El phrasing del shortlist como HECHOS ("Skills relevantes: X — <motivo>"), no como órdenes de sistema (disparan defensas anti-injection — research). Mantener el skip de `/flow` y `/role` (self-routean). Inglés en el fichero.
**Deliverable**: `skill-activation.ts` modificado (shortlist con motivos + skill-advisor incondicional en no-trivial + procesa `/goal`) + tests actualizados en `__tests__/skill-activation.test.ts` cubriendo: shortlist con motivo, skill-advisor siempre presente en no-trivial, `/goal` procesado, `/flow` saltado, presupuesto de líneas respetado.
**Verify**: `bun test ./.claude/hooks/` verde; pipe manual con prompts ES+EN muestra shortlist no vacío + skill-advisor; re-medir activación con evals (AC2 del spec).
**Ask first**: si la instrumentación de la open-question requiere acciones del usuario en sesión viva → pedirlo; si no, proceder con `[Suposición]` documentada.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | none |
| **Files touched** | `.claude/hooks/skill-activation.ts`, `__tests__/skill-activation.test.ts` |
| **TDD-mode** | forced (`processPayload` puro) |
| **Estimate** | M |
| **Cómo arrancar** | Resolver open-question del aterrizaje del hint; luego test rojo del shortlist-con-motivos |
| **Decisión absorbida** | — |

## User story

- **As a**: Lead que recibe hints del hook
- **I want**: que el hook me entregue un shortlist con motivos + me recuerde skill-advisor siempre, barato
- **So that**: la consideración de skills ocurra de forma determinista aunque yo no recuerde invocar nada

## Acceptance criteria

- **AC1**: Given un prompt no trivial (ES o EN), when corre `processPayload`, then la inyección incluye ≥1 skill candidata con motivo breve + nombra `skill-advisor`, de forma determinista (test puro).
- **AC2**: Given un prompt `/goal <tarea>`, when corre el hook, then procesa la tarea (no la salta); `/flow` y `/role` siguen saltándose.
- **AC3**: Given la inyección, when se cuenta, then respeta el presupuesto de líneas (≤6) y no tiene coste LLM.
- **AC4**: `bun test ./.claude/hooks/` verde; re-medida de activación ES/EN registrada vs baseline.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/hooks/skill-activation.ts` | Shortlist con motivos + skill-advisor incondicional + procesar `/goal` |
| `.claude/hooks/__tests__/skill-activation.test.ts` | Tests de los nuevos comportamientos |

## Workflow detallado

1. Resolver open-question (instrumentar dónde aterriza el hint o documentar `[Suposición]`).
2. (TDD rojo) Tests: shortlist-con-motivo, skill-advisor siempre en no-trivial, `/goal` procesado, `/flow` saltado, presupuesto líneas.
3. Implementar (verde): construir shortlist con motivo (del head/keywords), añadir skill-advisor incondicional en no-trivial, procesar `/goal` (strip wrapper), mantener skip de otros slash.
4. `bun test ./.claude/hooks/` verde.
5. Pipe manual ES+EN + re-medir con evals.

## Drillme (Socratic check)

1. `[approach]` ¿shortlist-con-motivo vs "Invoke Skill(X)"? → el motivo pre-articula el valor → más accionable (research: hints como hechos > órdenes).
2. `[context]` ¿interacción con US1? → nombra skill-advisor (US1 ya existe); el hook es la capa barata, skill-advisor la profunda.
3. `[failure]` ¿prompt trivial? → no inyectar skill-advisor (evita ruido/over-trigger en triviales).
4. `[failure]` ¿`/goal` no dispara UserPromptSubmit en runtime? → el cambio es correcto igual (no-op); documentado.

## SIEMPRE rules implementadas

- Determinista, sin LLM. Best-effort (no fuerza). Phrasing como hechos.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Resolver la open-question antes de afirmar el mecanismo |
| VII | Barato (sin LLM); entrega valor cada turno |

## Reutiliza

- `loadSkills`/`matchSkills` existentes.

## Verificación post-implementación

- `bun test ./.claude/hooks/` verde.
- Pipe: prompts ES+EN → shortlist + skill-advisor.

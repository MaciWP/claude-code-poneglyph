---
us: US6
title: Skill `critic` (Fase 4) — sin wrapper command + decisiones reviewer/review-patterns
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: implemented
approved: 2026-05-28
implemented: 2026-05-28
absorbs_decision: reviewer agent (KEEP-conditional ratificado) + review-patterns (KEEP ratificado)
ratified_decision: |
  reviewer agent: KEEP-conditional — invocado por critic solo cuando complejidad >60
    OR critical areas (auth/payments/security/data/secrets/crypto).
  review-patterns: KEEP — invocado como catálogo (Read references) en modo quality
    o performance per diff content; cero duplicación.
---

# US6 — `critic` skill + `/critic` command (Fase 4)

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | ✅ implemented (2026-05-28) |
| **Wave** | W2 (paralelo con US2-US5, US7) |
| **Depends on** | US1 |
| **Blocks** | US8 |
| **Files touched** | crear `.claude/skills/critic/SKILL.md` (NO wrapper command — docs Anthropic 2026); `reviewer` agent KEEP-conditional (no se toca); `review-patterns` KEEP (no se toca) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Read `spec.md` + `tasks/` + `state.json` → confirmar HUs cerradas → generar lista validaciones → ejecutar checks → producir `review.md` |
| **Decisión absorbida** | `reviewer` agent: CUT / KEEP-cond. `review-patterns`: **KEEP** (la skill la INVOCA como catálogo) |

## User story

- **As a**: developer que cerró todas las HUs de una feature
- **I want**: una skill que valide END-TO-END que el problema del spec.md fue resuelto, no solo que las HUs pasen individualmente
- **So that**: detecto gaps E2E del happy path + issues de quality/security/perf ANTES de cerrar la feature

## Acceptance criteria

- **AC1**: Given todas las HUs del `tasks/` marcadas `completed` en `state.json`, when se invoca o auto-activa al cierre, then `critic` arranca.
- **AC2**: Given la skill activa, when genera lista de validaciones, then sigue el template `review.template.md` (5 secciones: Correctness / Quality / Security / Performance / Mantenibilidad).
- **AC3**: Given las validaciones, when las ejecuta, then cada check pasa o se reporta como finding con severidad (BLOCKER / MAJOR / MINOR / NIT).
- **AC4**: Given el conjunto, when termina, then veredicto es: APPROVED / NEEDS_CHANGES / BLOCKED.
- **AC5**: Given NEEDS_CHANGES, when se detecta, then propone vuelta a Fase 3 con HU específica + diagnóstico.
- **AC6**: Given la spec.md original, when se compara con lo entregado, then detecta delta legítimo → propone update para living-spec loop (Fase 5).
- **AC7** (decisión absorbida — reviewer agent): Given la skill operativa, when se compara con `reviewer` agent (Opus), then se ejecuta:
  - **CUT** si critic cubre los casos sin necesidad de Opus independiente.
  - **KEEP-conditional** si Opus aporta valor real en reviews complejas (default propuesto: KEEP-cond, invocado por critic cuando complejidad >60 OR áreas críticas: auth/payments/security).
  - **ABSORB**: migrar lógica del agent al SKILL.md.
- **AC8** (decisión absorbida — review-patterns): Given la skill operativa, when se compara con `review-patterns` (skill existente con 17+ references valiosas: SOLID, N+1, complexity, refactoring), then **NO se corta**. `critic` documenta cómo la **invoca** como catálogo de patrones (modo quality o performance).

## Files a crear

| Path | Contenido |
|---|---|
| `.claude/skills/critic/SKILL.md` | Skill con frontmatter + workflow + drillme + invocación de review-patterns |
| `.claude/commands/critic.md` | Wrapper |

## Files condicionales (decisión AC7)

| Path | Acción |
|---|---|
| `.claude/agents/reviewer.md` | CUT → borrar. KEEP-cond → mantener intacto. ABSORB → borrar tras migrar contenido |
| `.claude/agent-memory/reviewer/MEMORY.md` | CUT → considerar borrar. KEEP-cond → mantener |

## Files que NO se tocan (decisión AC8)

| Path | Razón |
|---|---|
| `.claude/skills/review-patterns/` | KEEP — 17+ references valiosas no cubiertas por critic (SOLID, N+1, complexity, refactoring patterns) |

## Frontmatter de la skill

```yaml
---
name: critic
description: |
  End-to-end review after all HUs completed: validates the original problem
  from spec.md was solved (not just unit tests passing). Produces review.md
  with checklist (Correctness/Quality/Security/Performance/Mantenibilidad)
  + findings with severity + verdict. Invokes review-patterns catalog
  when applicable.
  Use when: feature complete, HUs all closed, review needed,
  "revisa", "critica", "valida", "review".
  Keywords - review, critic, valida, revisa, audita, e2e, happy-path,
  quality, regression
disable-model-invocation: false
---
```

## Workflow detallado

1. **Read** `spec.md` + `tasks/` (todas las US{N}.md) + `state.json` del directorio activo.
2. **Confirmar** que todas las HUs declaradas estén marcadas `completed`. Si no → STOP, escalar.
3. **Generar lista de validaciones** rellenando `review.template.md`:
   - **Correctness**: ¿Soluciona el problema del spec.md? ¿Happy path E2E? ¿Edge cases conocidos?
   - **Quality**: ¿Cobertura tests respeta `test-policy.md`? ¿Mismo estilo del proyecto? ¿Sin duplicación? ¿Sin sobre-ing?
   - **Security**: ¿No expone secrets? ¿No introduce vulns OWASP Top 10? ¿Inputs validados?
   - **Performance**: ¿Loops N² potenciales? ¿I/O dentro de loops? ¿Paralelismo aprovechado?
   - **Mantenibilidad**: ¿Comentarios solo donde "por qué" no es obvio? ¿Sin TODOs sin issue?
4. **Ejecutar checks ejecutables** (tests, lints, typecheck) → registrar resultados.
5. **Drillme Fase 4** (las 4):
   - **Drill 1**: ¿La spec.md sigue describiendo lo entregado? (delta → living-spec loop)
   - **Drill 2**: ¿El happy path COMPLETO funciona, no solo módulos?
   - **Drill 3**: ¿Hay un edge case que no probamos pero que el usuario sufrirá?
   - **Drill 4**: ¿La cobertura de tests es la que `test-policy.md` espera?
6. **Invocar `review-patterns` skill** según contenido:
   - Si refactoring/quality concerns → modo quality (Read references/01-mode-quality.md).
   - Si performance concerns → modo performance (Read references/02-mode-performance.md).
   - Aplicar checklist correspondiente del catálogo.
7. **Si complejidad de la feature >60 OR áreas críticas (auth/payments/security)** y decisión AC7 = KEEP-cond → invocar `reviewer` agent (Opus) para review independiente.
8. **Si security relevante** → invocar `security-review` skill (existente).
9. **Producir `review.md`** rellenando template con checklist + findings + veredicto.
10. **Reportar**:
    - APPROVED → siguiente: Fase 5 (retro).
    - NEEDS_CHANGES → vuelta a Fase 3 con HU(s) específicas + diagnóstico.
    - BLOCKED → escalar al usuario.

## Drillme block (literal)

```markdown
## Drillme — Phase 4

1. **Spec drift?** Does the spec.md still describe what was delivered? If not, mark delta for living-spec loop.
2. **E2E happy path?** Does the full happy path work, not just modules?
3. **Edge case the user will hit?** Is there an edge case we didn't test that real usage will surface?
4. **Coverage matches policy?** Does test coverage match what test-policy.md expects?

> **For full Socratic check, invoke the `drillme` skill** (US11). The 4 questions above are phase-specific (E2E + spec drift + coverage); drillme provides the canonical 4-category catalog (broader location/approach/context/failure). Do NOT duplicate the canon here.
>
> Skill→skill invocation is probabilistic — if drillme does not auto-fire, the Lead invokes `/drillme "Phase 4 review of <NNN-slug>"` manually before producing the final verdict.
```

## SIEMPRE rules

- Preguntar o mencionar mejoras detectadas (refactor, smells, optimizaciones).

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Honest findings sin softening |
| IV | APPROVED gate o no se cierra |
| VI | Security check explícito |
| VII | Performance check explícito |
| IX | Living-spec loop si hay delta |

## Reutiliza

- `review-patterns` skill (catálogo — modo quality o performance).
- `security-review` skill cuando aplica.
- `diagnostic-patterns` si hay fallos en checks ejecutables.
- `anti-hallucination` (verificar findings antes de reportar).
- `reviewer` agent (condicional, según AC7 — Opus para reviews críticas).

## Decisión AC7 — análisis

| Dimensión | Pregunta |
|---|---|
| Uso histórico | ¿reviewer fue invocado en transcripts? ¿qué tipo de reviews? |
| Valor único | Opus aporta análisis más profundo que Sonnet en reviews complejas/arquitecturales |
| Coste | Opus delegation = +5-10K tokens. Justificado solo en complejidad >60 o áreas críticas |
| Sin reviewer | ¿critic ejecutándose como skill cubre el 80% de los casos? Probablemente sí |

**Veredicto propuesto**: **KEEP-conditional** — mantener `reviewer` agent, invocado por `critic` solo cuando complejidad >60 OR áreas críticas (auth/payments/security/data). Criterio explícito en SKILL.md.

## Decisión AC8 — `review-patterns` análisis (verificado)

Tras leer `review-patterns/SKILL.md` (83 líneas + 17 references):

| Aporte único de review-patterns | Cubierto por critic? |
|---|---|
| SOLID violations detail (5 principios) | NO — critic es genérico |
| Complexity metrics (cyclomatic/cognitive) | NO |
| Anti-patterns table | NO |
| Extract function/class patterns | NO |
| N+1 query patterns + variants | NO |
| Memory leak patterns | NO |
| Refactoring safety checklists | NO |
| Severity levels compartidos | Parcial — critic los reusará |

**Veredicto**: **KEEP review-patterns** + critic la **invoca como catálogo** vía `Read .claude/skills/review-patterns/references/<mode>.md` durante Fase 4. No duplicar contenido.

## Adaptación intra-fase

| Señal | Adaptación |
|---|---|
| Feature trivial (Fase 3a minimal) | Review light: solo checks ejecutables (tests + typecheck) + drillme drill 1. Saltar reviewer agent + review-patterns + security-review |
| Feature arquitectural | Review full: invocar reviewer + review-patterns + security-review |
| Solo cambios doc | Review mínimo: checklist Mantenibilidad + drillme drill 1 |

Declarar en `review.md`: "Review light/standard/full por motivo X".

## Casos edge

- **Edge 1**: HUs marcadas completed pero tests fallan → STOP, escalar antes de generar review.md.
- **Edge 2**: Spec.md fue editado durante implementación (living-spec loop) → revisar contra la versión actual, no la aprobada.
- **Edge 3**: `review-patterns` no existe (cortada por error) → fallback a checklist embebido en `review.template.md`.

## Smell signals

- ⚠️ Si veredicto siempre APPROVED sin findings → smell de "review theater"; revisar el rigor de la skill.
- ⚠️ Si NEEDS_CHANGES en >3 iteraciones consecutivas → la spec o las HUs están mal definidas; volver a Fase 1/2.

## Verificación post-implementación

- Smoke: invocar `/critic` con feature completa → produce `review.md` con findings o APPROVED.
- Si decisión AC7 = CUT: `Grep "reviewer" .claude/` retorna refs solo a `critic`, no a `reviewer` agent.
- `review-patterns/SKILL.md` sigue existente e invocable.

## Open questions (implementación)

- ¿`critic` puede invocar `reviewer` agent vía `Agent(subagent_type=reviewer)` o lo invoca el Lead? — patrón sub-skill→agent.
- Si `reviewer` se KEEP-cond: ¿se actualiza su SKILL.md frontmatter para reflejar que ahora se invoca solo desde critic?

## Closeout (2026-05-28)

**AC7 ratificado**: KEEP-conditional para `reviewer` agent.
**AC8 ratificado**: KEEP para `review-patterns` skill.

### AC7 — `reviewer` agent

| Evaluación | Veredicto |
|---|---|
| CUT | ✗ Rechazado — Opus aporta análisis más profundo que Sonnet (modelo del skill) en reviews arquitecturales; `agent-memory/reviewer/MEMORY.md` ya existe con insights preservables |
| ABSORB | ✗ Rechazado — workflow inline en SKILL.md no replica (a) aislamiento de contexto sub-agent, (b) upgrade a Opus, (c) read-only permission mode del agent |
| **KEEP-conditional** | ✓ **Adoptado** — `reviewer` se mantiene; `critic` lo invoca solo cuando complejidad >60 OR áreas críticas (auth/payments/security/data/secrets/crypto); criterio en `critic/SKILL.md` Step 7 |

### AC8 — `review-patterns` skill

| Aporte único de `review-patterns` | Cubierto por `critic`? |
|---|---|
| SOLID violations (5 principios) | NO — critic checklist es genérico |
| Cyclomatic/cognitive complexity | NO |
| Anti-patterns catalog | NO |
| Extract function/class patterns | NO |
| N+1 query variants | NO |
| Memory leak patterns | NO |
| Refactoring safety checklists | NO |

**Veredicto**: KEEP `review-patterns`. `critic` lo invoca como catálogo vía `Read .claude/skills/review-patterns/references/<mode>.md` (Step 6). Cero duplicación de contenido.

**Open Q resuelta**: el SKILL.md de `critic` invoca `Agent(subagent_type=reviewer)` con `[RELEVANT SKILLS]` + `[RELEVANT MEMORY]` blocks (Arch H), no el Lead a ciegas. Reviewer agent runs `background: true` per su frontmatter — critic continúa otros checks en paralelo.

**Entregables**:

| Path | Estado | Notas |
|---|---|---|
| `.claude/skills/critic/SKILL.md` | Creado (447 líneas) | Frontmatter empírico; 11-step workflow; 5-section checklist (Correctness/Quality/Security/Performance/Maintainability); 9 auxiliary skills block; AC7+AC8 closeout interno; embedded fallback si `review.template.md` falta |
| `.claude/commands/critic.md` | NO creado | Docs Anthropic 2026: skill name = command name; `/critic` resuelve directo |
| `.claude/agents/reviewer.md` | NO tocado | KEEP intacto |
| `.claude/agent-memory/reviewer/MEMORY.md` | NO tocado | KEEP intacto |
| `.claude/skills/review-patterns/` | NO tocado | KEEP intacto (17+ refs únicas) |

**Verificación post-impl**:
- `bun test ./.claude/hooks/` → 81/81 ✅
- Harness registra `/critic` skill con metadata empírica ✅
- `review-patterns` + `reviewer` agent siguen disponibles e invocables ✅
- Auxiliaries listadas (anti-hallucination, drillme, diagnostic-patterns, lsp-operations, review-patterns, security-review, decision-stress-test, explain-changes, simplify) están todas disponibles en el registry ✅

**Smoke**: invocar `/critic` no aplica hasta que una feature end-to-end llegue a Phase 4 (dogfooding US10 + orquestación US8 `/flow`).

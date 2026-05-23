---
id: US-024
phase: 2.6
status: pending
estimate: 60m
blocks: []
blockedBy: [US-022, US-023]
priority: critical
risk: medium
---

# US-024 · Verificación final end-to-end (smoke test + snapshot de coste)

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** ejecutar una verificación integral del sistema post-cortes
**Para** confirmar que las Fases 1+2 no rompieron nada y que los cortes producen los ahorros esperados

## Contexto extendido

### Evidencia recogida

Antes de cerrar la auditoría como "completa", se necesita:
1. **Confirmar que el sistema sigue funcional** — no hay referencias rotas, no faltan dependencias
2. **Establecer baseline post-cortes** para comparar contra el pre-cortes de US-004
3. **Generar el reporte final** que demuestre que el plan funcionó (o señale dónde no funcionó)

### Por qué importa

- **Sin verificación, "cortar" puede haber roto algo silenciosamente** que solo se descubre en uso futuro
- **Sin medición**, no podemos afirmar que el ahorro existe — sería volver al problema original (declarar sin datos)
- **Es el cierre formal** de Fases 1+2

## Análisis — pros y contras

### Pros

- **Confianza** en el estado del sistema
- **Baseline numérica** para futuros ajustes
- **Detecta problemas tempranos** mientras las decisiones están frescas (más fácil de revertir)

### Contras

- **60 min de trabajo no productivo** (verificación, no creación)
- **Si descubre problemas**, abre nuevos US y delays el cierre

### Mitigación de contras

- La verificación es esencial; sin ella, el éxito es ilusorio
- Si encuentra problemas, mejor descubrirlos ahora que en 2 meses

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Descubrir un componente cortado que sí se necesitaba | Media | Medio | Rollback parcial: restaurar solo ese componente sin deshacer toda la auditoría |
| El coste no baja como se esperaba | Media | Bajo | Aceptar — los cortes son valor en sí (mantenibilidad, claridad) incluso si el ahorro $ es menor |
| El sistema queda inestable (hooks no se ejecutan, skills no se activan) | Baja | Alto | Smoke test exhaustivo en este US, no avanzar hasta resolver |
| Tests del repo fallan | Media | Medio | Iterar correcciones; si los tests son inválidos por el corte, actualizarlos |

## Pasos técnicos detallados

### Paso 1 — Verificación estructural (10 min)

```bash
# Contadores reales
Glob .claude/agents/*.md                 # debe ser ~5
Glob .claude/skills/**/SKILL.md          # debe ser ~14
Glob .claude/hooks/*.ts                  # archivos hook (sin lib/ y __tests__)
Glob .claude/commands/*.md               # debe ser ~5
Glob .claude/rules/**/*.md               # debe ser ~4

# settings.json — contar hooks registrados
Read .claude/settings.json
```

Documentar contadores en sección "Estado final" de este archivo.

### Paso 2 — Verificación de referencias rotas (10 min)

```bash
# No deben encontrar referencias huérfanas a componentes eliminados
Grep "code-quality\\|security-review\\|performance-review" .claude/ -l  # debe ser 0 (excepto review-patterns/references/)
Grep "decision-stress-test" .claude/                                     # debe ser 0
Grep "meta-create-" .claude/                                             # debe ser 0 (excepto en templates si los nombres son distintos)
Grep "subagent_type.*architect[^-]" .claude/                             # 0 (no debe haber referencias al agent architect, ojo con extension-architect)
Grep "memory-inject" .claude/                                            # 0 si US-006 = CUT
Grep "parallelism-metrics" .claude/                                      # 0
Grep "bootstrap-plan-mode" .claude/                                      # 0 (ahora bootstrap-lead)
Grep "validate-file-contains" .claude/                                   # 0
Grep "/decide\\|/sync-claude\\|/explain-changes\\|/planner\\|/eval-skill\\|/parallelism-insights" .claude/  # 0 menciones al comando (no a la skill, distinta cosa)
Grep "homedir.*traces\\|~/.claude/traces" .claude/hooks/    # 0 — escritores huérfanos a pipeline cortado
Grep "homedir.*parallelism-metrics" .claude/hooks/          # 0 tras US-005
Grep "homedir.*scoring" .claude/hooks/                      # 0 tras corte de scoring
```

Cualquier hit es un TODO: actualizar la referencia.

**Aprendizaje meta (incorporado tras cierre de US-002, 2026-05-23)**: cortar el consumidor sin auditar los productores es la causa raíz del patrón zombie. En el cierre de US-002 se detectaron `pre-compact.ts` e `instructions-loaded.ts` escribiendo a `~/.claude/traces/` 24 días después de eliminar `trace-logger.ts`. Por eso esta verificación añade greps específicos a directorios de pipeline cortado, no solo a referencias por nombre de componente.

### Paso 3 — Tests automatizados (5 min)

```bash
Bash: bun test ./.claude/hooks/
```

Debe pasar 100%. Si falla:
- Investigar test específico
- Si el test verifica algo eliminado: actualizar/eliminar el test
- Si el test descubre un bug real: arreglar

### Paso 4 — Smoke test 1: sesión vanilla (10 min)

1. **Cerrar sesión actual** (si es posible) y abrir nueva
2. **Primer mensaje**: "¿Qué pasos del orchestration-checklist debes ejecutar antes de responder?" → debe responder los 5 pasos
3. **Mensaje complejo**: "Quiero refactorizar el módulo X que usa la dependencia Y" → debe iniciar flujo de planning/delegation
4. **Verificar que el Lead no menciona componentes cortados**

### Paso 5 — Smoke test 2: capacidades clave (15 min)

Probar las capacidades que SÍ deben funcionar tras los cortes:

| Capacidad | Test prompt | Resultado esperado |
|---|---|---|
| Code review | "Hazle code review a `.claude/hooks/security-gate.ts` (mode security)" | Activa `review-patterns`, lee reference de security |
| Decisión rápida | "Decido entre Bun y Node" | Activa `decide` modo shallow |
| Decisión profunda | "Stress-testea la decisión de migrar a Bun" | Activa `decide` modo deep |
| Planning | "Planea cómo refactorizar la auth" | Activa `planner-protocol`, sugiere nivel |
| Exploración bulk | "Lee 5 archivos en `.claude/hooks/` y resume cada uno" | Delega a `Explore` (built-in) |
| Crear extensión | "Crea un nuevo hook `say-hi.ts`" | Invoca `extension-architect`, usa template |

Cada fallo se documenta como TODO.

### Paso 6 — Snapshot de coste post-cortes (5 min)

```
/cost
```

Capturar valor. Comparar contra snapshot pre-cortes de US-004.

```
Coste pre-cortes (US-004): $___/día (según console)
Coste post-cortes (hoy): $___/día (según /cost o console)
Ahorro observado: ___%
```

**Caveat**: 1 día de uso post-cortes no es estadísticamente significativo. La hipótesis "-15% a -30%" debe verificarse tras 7 días de uso normal — esto es solo el baseline inicial.

### Paso 7 — Verificación del observatorio (US-001/US-002) (5 min)

Si US-002 = REPARAR trace-logger:
- `Glob ~/.claude/traces/*.jsonl` ordenado por fecha → debe haber JSONL con fecha de hoy
- Verificar que el contenido es coherente (campos esperados)

Si US-002 = CUT trace-logger:
- Confirmar que `/cost` y `console.anthropic.com` son las únicas fuentes de coste

### Paso 8 — Generar reporte final (10 min)

Crear `D:\PYTHON\claude-code-poneglyph\PONEGLYPH-AUDIT-RESULT.md` (o anexo en PONEGLYPH-AUDIT.md):

```markdown
# Resultado de la auditoría — 2026-05-22 a YYYY-MM-DD

## Sistema antes vs después

| Métrica | Antes | Después | Delta |
|---|---|---|---|
| Agents | 7 | ___ | ___ |
| Skills | 28 | ___ | ___ |
| Hooks (registrados) | 15 | ___ | ___ |
| Commands | 10 | ___ | ___ |
| Rules | 7 | ___ | ___ |
| LOC `.claude/` | 25.455 | ___ | ___ |
| Coste/día estimado | $___ | $___ | ___% |

## Lo que funcionó
- ___

## Lo que sorprendió
- ___

## TODOs derivados
- ___

## Decisión final
- Auditoría cerrada SI / NO (si NO, qué falta)
```

### Paso 9 — Commit (5 min)

```
docs(audit): close Phases 1+2 with end-to-end verification

- Smoke tests: all key capabilities preserved
- No broken references found
- bun test passes
- Cost snapshot: <pre> → <post>
- Generated PONEGLYPH-AUDIT-RESULT.md with metrics
```

## Criterios de aceptación

- [ ] Contadores reales documentados (agents, skills, hooks, commands, rules, LOC)
- [ ] 0 referencias huérfanas (Grep verifications)
- [ ] `bun test ./.claude/hooks/` pasa 100%
- [ ] Smoke test 1 (sesión vanilla): el Lead funciona sin errores
- [ ] Smoke test 2 (capacidades clave): cada capacidad probada funciona
- [ ] Snapshot de coste post-cortes capturado
- [ ] Trace-logger verificado (escribe o no, según decisión US-002)
- [ ] Reporte `PONEGLYPH-AUDIT-RESULT.md` generado
- [ ] Commit final realizado

## Definition of Done

1. Estado final documentado con números reales
2. Smoke tests pasan
3. Sin referencias huérfanas
4. Reporte de resultados generado
5. Commit
6. Frontmatter `status: completed`

## Rollback plan

Si en alguno de los smoke tests se descubre un problema crítico (e.g. el Lead ya no puede delegar a builder):
1. Identificar el commit que rompió la funcionalidad
2. `git revert <hash>` de solo ese commit
3. Re-ejecutar smoke test
4. Si persiste el problema: rollback más profundo

**No usar `git reset --hard`** — usar `git revert` que preserva historia.

## Estado final (rellenar tras ejecución)

| Métrica | Valor real |
|---|---|
| Agents | ___ |
| Skills | ___ |
| Hooks (registrados) | ___ |
| Commands | ___ |
| Rules | ___ |
| LOC `.claude/` | ___ |
| Coste pre-cortes ($/día) | ___ |
| Coste post-cortes ($/día) | ___ |
| Ahorro observado | ___% |
| Smoke tests pasados | __/__ |
| Tests `bun test ./.claude/hooks/` | PASS / FAIL |

## Notas

- Esta es la historia que "cosecha" el valor del replanteo. Sin ella, todo lo anterior queda sin validación
- Si el ahorro observado es <15%, **no es razón para revertir** — los beneficios cualitativos (mantenibilidad, claridad) compensan
- Si el ahorro observado es >40%, considera publicar el aprendizaje como post / nota para futuros usuarios de Claude Code
- Tras esta historia, considerar abrir un US-024b en 1 semana para verificar que las métricas se mantienen (no eran ruido del día concreto)

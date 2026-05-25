---
id: US-021
phase: 2.5
status: completed
estimate: 30m
blocks: []
blockedBy: []
priority: low
risk: low
---

# US-021 · DEGRADE `scout`: usar solo si `Explore` built-in no disponible

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** cambiar el disparador del agent `scout` para que se invoque solo cuando `Explore` built-in no está disponible
**Para** aprovechar `Explore` (Haiku, barato, score 83) y reducir el uso de `scout` (Sonnet, más caro, score 60)

## Contexto extendido

### Evidencia recogida

| Agente | Modelo | Score promedio | Coste relativo |
|---|---|---|---|
| `Explore` (built-in de Claude Code) | Haiku | **83** | 1x (baseline) |
| `scout` (custom, definido en poneglyph) | Sonnet | 60 | ~5x respecto a Haiku |

`Explore` ya está disponible como subagent built-in de Claude Code y tiene mejores datos de éxito. `scout` fue creado antes posiblemente, o para casos donde `Explore` no llegaba.

### Casos donde scout aún tiene sentido

- Si `Explore` tiene window de lectura corta (4 archivos) y `scout` tiene más
- Si `scout` tiene tools que `Explore` no tiene (e.g. WebSearch, WebFetch para scout sí, no para Explore)
- Si el caso requiere "synthesis" pesada (HIGH+HIGH en la matriz de Trigger B)

### Caminos posibles

1. **Eliminar scout completamente**: si `Explore` cubre todo, scout es bloat
2. **Mantener scout pero cambiar prioridad**: el Lead invoca `Explore` por defecto; solo `scout` para casos específicos
3. **Mantener ambos con criterio claro** (lo que ya está, pero documentado mejor)

**Recomendación**: opción 2. Mantener `scout` para casos específicos pero documentar claramente cuándo elegirlo.

### Por qué importa

- **`Explore` tiene los mejores datos** del sistema (score 83 con n>=múltiples). Es el agente más probado y barato
- **`scout` se invoca cuando `Explore` bastaría**: pagamos Sonnet por trabajo que Haiku haría igual o mejor
- **Reduce coste promedio** sin perder capacidad

## Análisis — pros y contras

### Pros de la degradación

- **Reduce coste promedio**: cada vez que el Lead elige `Explore` en vez de `scout`, ahorra ~80% (Haiku vs Sonnet)
- **Aprovecha el mejor agente medido**: `Explore` score 83
- **Mantiene scout como fallback**: si Explore falla o no aplica, scout sigue disponible
- **Cambio bajo riesgo**: es cuestión de documentación + actualización de criterios en bootstrap

### Contras de la degradación

- **Si los criterios no son claros, el Lead sigue usando scout por defecto** → ahorro nulo
- **Si `Explore` realmente tiene limitaciones que scout no**, degradar lo "fácil" puede empeorar exploraciones complejas

### Mitigación de contras

- Documentar criterios concretos en `bootstrap-lead.md` (Trigger B matrix)
- Smoke test: dar al Lead un caso de exploración y verificar qué elige

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El Lead sigue usando scout por defecto | Alta | Bajo | Criterios explícitos en bootstrap-lead, refrescables tras compactación |
| `Explore` tiene una limitación que rompe casos antes manejados por scout | Media | Medio | Mantener scout para HIGH+HIGH; smoke test específico |
| Documentación de criterios se vuelve obsoleta cuando Claude Code update `Explore` | Baja | Bajo | Anotar en MEMORY.md cuándo se hizo el cambio para revisar en 3 meses |

## Pasos técnicos detallados

### Paso 1 — Inspeccionar scout y el Trigger B (5 min)

```bash
Read .claude/agents/scout.md
Read .claude/rules/bootstrap-lead.md       # Trigger B matrix
```

Verificar:
- Qué tools tiene scout (WebSearch, WebFetch incluidos?)
- Cómo describe el Trigger B la elección entre Explore y scout (matriz 2x2 LOW/HIGH)

### Paso 2 — Identificar casos donde scout aún tiene ventaja (10 min)

Compara capacidades:

| Capacidad | Explore (built-in) | scout (custom) |
|---|---|---|
| Search (Grep, Glob) | ✅ | ✅ |
| Read | ✅ | ✅ |
| LSP (semantic) | ? | ✅ |
| WebSearch | ? | ✅ |
| WebFetch | ? | ✅ |
| Síntesis pesada | limitada (Haiku) | mejor (Sonnet) |

Casos donde scout sigue siendo necesario:
- WebSearch / WebFetch necesarios (e.g. investigar best practices externas)
- Síntesis multi-archivo con razonamiento (e.g. "compara estos 5 archivos y extrae el patrón")
- LSP semántico complejo

### Paso 3 — Actualizar Trigger B matrix en bootstrap-lead.md (5 min)

```markdown
### Trigger B — Delegate exploration (matriz 2×2 + casos especiales)

| Volume / Complexity | Action |
|-----------------------|--------|
| LOW + LOW (1-2 files, direct read) | Lead `Read` directly |
| LOW + HIGH (1-2 files, requires LSP/semantics) | `Explore` (Haiku, score 83) if no synthesis; `scout` if heavy synthesis |
| HIGH + LOW (≥3 files, bulk read without reasoning) | `Explore` (Haiku) — best fit |
| HIGH + HIGH (≥3 files, requires synthesis) | `scout` (Sonnet) |
| WebSearch / WebFetch needed | `scout` (only it has those tools) |
```

Énfasis en que `Explore` es la opción default; `scout` es para casos específicos.

### Paso 4 — (Opcional) Actualizar prompt de scout (5 min)

Si scout es solo para casos especiales, su description debería reflejarlo:

```yaml
description: |
  Heavy exploration agent for HIGH+HIGH cases (multi-file synthesis)
  or when WebSearch/WebFetch tools are needed.
  Default exploration: use built-in Explore (Haiku) instead.
keywords: synthesize, deep dive, multi-file, web research, ...
```

### Paso 5 — Smoke test (5 min)

1. Tarea LOW+LOW (1 archivo): el Lead debe Read directamente, no delegar
2. Tarea HIGH+LOW (5 archivos read bulk): el Lead debe elegir `Explore`
3. Tarea HIGH+HIGH (sintetizar arquitectura de 3 módulos): el Lead debe elegir `scout`
4. Tarea con WebSearch: el Lead debe elegir `scout`

### Paso 6 — Commit (3 min)

```
refactor(agents): degrade scout — Explore (built-in) is the default

- Updated Trigger B matrix in bootstrap-lead.md
- Explore (Haiku, score 83) preferred for bulk reads and LOW+HIGH cases
- scout (Sonnet, score 60) reserved for HIGH+HIGH synthesis and WebSearch/WebFetch

Estimated cost reduction: scout invocations -50%+ since Explore covers more cases
than previously documented.
```

## Criterios de aceptación

- [ ] `bootstrap-lead.md` Trigger B matrix actualizada con `Explore` como default
- [ ] `scout` description (frontmatter) actualizada para reflejar uso específico
- [ ] Smoke test: el Lead elige `Explore` para casos bulk-read
- [ ] Smoke test: el Lead elige `scout` para casos con WebSearch o síntesis pesada
- [ ] Commit realizado

## Definition of Done

1. Documentación de criterios actualizada
2. Smoke test confirma cambio de prioridad
3. Commit
4. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura criterios anteriores
```

## Notas

- Esta historia NO elimina `scout` — solo cambia cuándo se prefiere. Si quieres eliminarlo del todo, abre US-021b basado en datos tras 2 semanas
- La métrica clave a vigilar: % de exploraciones que se delegan a `Explore` vs `scout` antes vs después
- Si `Explore` mejora en futuras versiones de Claude Code, scout puede volverse innecesario por completo
- Considera añadir al MEMORY.md global una nota: "Default exploration: Explore built-in. scout solo para HIGH+HIGH o WebSearch"

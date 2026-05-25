---
id: US-018
phase: 2.4
status: completed
estimate: 40m
blocks: []
blockedBy: [US-014]
priority: medium
risk: medium
---

# US-018 · MERGE `performance.md` rule en `orchestrator-protocol §Verify First`

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** mover el contenido de la rule `performance.md` (Tool Hierarchy, batch operations) a la skill `orchestrator-protocol §Verify First`
**Para** eliminar la duplicación de contenido entre rule y skill

## Contexto extendido

### Evidencia recogida

`performance.md` (~40 líneas) contiene:
- Jerarquía de herramientas: LSP > Grep > Glob
- Batch operations (cuándo paralelizar)
- Anti-patterns (read one by one, sequential agents)
- Quality triggers (cuándo usar reviewer)
- Cascading cancel risk

`orchestrator-protocol/SKILL.md` (sección Verify First, según referencia en CLAUDE.md) ya menciona:
- Tool hierarchy (LSP/Grep/Glob)
- Batch operations
- Cascade en parallel calls

**Solapamiento explícito**: ambos cubren la misma información sobre herramientas y paralelismo.

### Por qué importa

- **Contenido duplicado**: cada actualización tiene que ir a 2 sitios
- **El Lead carga ambos**: rule (always-on) + skill (cuando se invoca)
- **Una fuente de verdad** simplifica mantenimiento
- **Coherencia post-auditoría**: 7 rules → 4 rules

## Análisis — pros y contras

### Pros del merge

- **Una fuente de verdad** para el patrón de herramientas/paralelismo
- **Reduce `rules/` a 5** (con US-016, US-017, US-018 llegamos a 4)
- **Si el contenido vive solo en skill**, los subagents que carguen la skill lo tienen; el Lead siempre la tiene cargada (es la skill principal)

### Contras del merge

- **`performance.md` como rule se aplicaba a TODOS (Lead + subagents)** automáticamente. Si se mueve a skill, los subagents que NO carguen la skill se pierden el contenido
- **Bloat en `orchestrator-protocol`**: mover 40 líneas a una skill que se acaba de compactar (US-014) parece contradictorio

### Mitigación de contras

- **Subagents**: el contenido más crítico (LSP > Grep) se puede mantener en `rules/paths/` que es path-scoped, o referenciar la skill explícitamente desde los agents que lo necesitan
- **Bloat post-compactación**: el contenido debe ir a la reference correspondiente de `orchestrator-protocol` (no al SKILL.md principal), no duplicando la compactación de US-014

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Subagents pierden acceso al patrón "LSP > Grep" porque no cargan la skill | Media | Medio | Mantener una versión compacta (5 líneas) en rules globales o en `paths/orchestration.md` |
| US-014 ya compactó orchestrator-protocol y añadir 40 líneas lo vuelve a inflar | Alta | Medio | Añadir a una reference (e.g. `references/01-verification.md`), no a SKILL.md |
| El contenido movido no es exactamente equivalente al original (formato, nuance) | Media | Bajo | Diff cuidadoso antes de eliminar el original |
| Algunos agentes referencian `performance.md` por nombre | Media | Bajo | Grep antes de eliminar |

## Pasos técnicos detallados

### Paso 1 — Inspeccionar contenido (10 min)

```bash
Read .claude/rules/performance.md
Read .claude/skills/orchestrator-protocol/SKILL.md                  # post-US-014
Glob .claude/skills/orchestrator-protocol/references/*
Read .claude/skills/orchestrator-protocol/references/01-verification.md  # destino candidato
```

**Identificar**:
- ¿Qué hay en `performance.md` que NO esté ya en `orchestrator-protocol`?
- ¿Cuál es la mejor reference de destino? (probablemente `01-verification.md` o crear `09-performance.md`)

### Paso 2 — Decidir destino dentro de `orchestrator-protocol` (5 min)

Opciones:
- **A**: añadir a `references/01-verification.md` (donde está la sección Verify First)
- **B**: crear nueva `references/09-performance.md` dedicada
- **C**: añadir al SKILL.md compactado (mala idea — contradice US-014)

**Recomendación**: B. Tener una reference dedicada a "performance & navigation" es más limpio. El SKILL.md compactado puntea a ella.

### Paso 3 — Crear o ampliar reference (15 min)

```bash
Write .claude/skills/orchestrator-protocol/references/09-performance.md
# o ampliar 01-verification.md si la opción es A
```

Contenido:
- Sección "Tool Hierarchy" (LSP > Grep > Glob)
- Sección "Batch Operations" (paralelismo mandatory)
- Sección "Anti-patterns"
- Sección "Cascading Cancel"

Adaptar el formato al estilo de las references existentes.

### Paso 4 — Actualizar SKILL.md de orchestrator-protocol (3 min)

```bash
Edit .claude/skills/orchestrator-protocol/SKILL.md
```

En la tabla de references, añadir:
```
| 09-performance.md | Tool hierarchy (LSP > Grep > Glob), batch operations, parallelism rules |
```

### Paso 5 — Decidir sobre fallback para subagents (5 min)

Si los subagents necesitan el contenido sin cargar la skill completa:
- **Opción 1**: mantener una versión muy compacta (5 líneas) en `rules/paths/orchestration.md`
- **Opción 2**: añadir referencia explícita en los agentes que más lo necesitan (`scout`, `builder`)
- **Opción 3**: confiar en que los subagents reciben las instrucciones del Lead, que sí tiene la skill

**Recomendación**: opción 1 — versión compacta en `rules/paths/orchestration.md`:

```markdown
## Tool Hierarchy (crítico, baseline)

LSP > Grep > Glob. Batch independent operations. Anti-pattern: sequential reads.

(Detalles completos en skill `orchestrator-protocol` ref 09-performance.md)
```

### Paso 6 — Eliminar `performance.md` (1 min)

```bash
Bash: rm .claude/rules/performance.md
```

### Paso 7 — Verificar referencias externas (3 min)

```bash
Grep "performance.md" .claude/
Grep "rules/performance" .claude/
```

Actualizar.

### Paso 8 — Smoke test (5 min)

1. Pedirle al Lead: "Recuerda las reglas de performance — ¿en qué orden uso LSP, Grep, Glob?" → debe responder LSP > Grep > Glob
2. Pedirle a un subagent (delegar): "¿Cómo deberías hacer 3 reads de archivos independientes?" → debe sugerir paralelo

### Paso 9 — Commit (3 min)

```
refactor(rules): merge performance.md into orchestrator-protocol/references/09-performance.md

- Detailed content in skill reference (lazy-loaded)
- Compact baseline in rules/paths/orchestration.md for subagents
- Eliminates duplication between rule and skill §Verify First

rules/ count: 6 → 5 (assuming US-016, US-017 already executed)
```

## Criterios de aceptación

- [ ] `.claude/rules/performance.md` no existe
- [ ] Contenido detallado preservado en `orchestrator-protocol/references/09-performance.md`
- [ ] Baseline compacto preservado en `rules/paths/orchestration.md` (5 líneas)
- [ ] Smoke test: Lead y subagent responden correctamente sobre tool hierarchy
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado

## Definition of Done

1. Merge realizado
2. Baseline para subagents preservado
3. Smoke test ok
4. Commit
5. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura performance.md como rule independiente
```

## Notas

- Esta historia bloqueada por US-014 (compactación de orchestrator-protocol) porque el destino del contenido es una reference dentro de la skill — primero hay que tener la skill ordenada
- Si en el Paso 1 se descubre que `performance.md` y `orchestrator-protocol` NO se solapan tanto como se asumió, evaluar mantener performance.md como rule simplificada
- En ese caso, la historia se cierra como NO-MERGE pero CON COMPACTACIÓN de performance.md (reducir a la mitad)

---

## Execution closure (2026-05-25)

**Veredicto**: ejecutada. La rule `.claude/rules/performance.md` ha sido eliminada y su contenido movido a `.claude/skills/orchestrator-protocol/references/04-agent-selection.md` como nueva sección "Parallelization & Batch Operations".

**Análisis del solapamiento real** (Paso 1):

| Bloque de `performance.md` | Destino | Razón |
|---|---|---|
| Tool Hierarchy (LSP > Grep > Glob) | YA presente en `references/01-verification.md` y SKILL.md §0 | Duplicado — no migrar |
| LSP Operations table | YA presente en skill `lsp-operations` | Duplicado — pointer añadido |
| Batch Operations (parallel vs sequential) | **NUEVO** en `04-agent-selection.md` §Parallelization | Útil y no estaba documentado en el skill |
| Cascading Cancel risk | **NUEVO** en `04-agent-selection.md` §Cascading Cancel | Crítico, no estaba documentado |
| Anti-Patterns (parcial) | Fusionados con la tabla Anti-Patterns existente de `04-agent-selection.md` | 4 nuevas filas añadidas (Reading one by one, sequential agents, Glob→Read→Grep, Edit sin Read) |
| Quality Triggers (reviewer) | YA presente en SKILL.md §1 Step 5 | Duplicado — no migrar |

**Por qué destino `04-agent-selection.md`** (no §Verify First):

§Verify First trata de cómo VERIFICAR antes de afirmar. La batch ops + cascading cancel trata de cómo INVOCAR las tools paralelo vs sequential. Son ortogonales. `04-agent-selection.md` ya contenía la Exploration Decision Matrix + Multi-Agent Patterns + Anti-Patterns, así que es el lugar natural para "Parallelization & Batch Operations".

**Cambios**:
- `.claude/rules/performance.md` ELIMINADO (68 líneas).
- `.claude/skills/orchestrator-protocol/references/04-agent-selection.md` ampliado +43 líneas (sección Parallelization + 4 anti-patterns nuevos).
- Pointer a skill `lsp-operations` añadido en la nueva sección para que el contenido LSP no se duplique.

**Rules ahora**: 3 → 2 (`bootstrap-lead`, `error-recovery` + `paths/`). El audit original esperaba reducir a 4; con US-016+US-017+US-018 hemos llegado a 2 + carpeta `paths/` con 2 archivos.

**Tests**: 139/139 pasan.

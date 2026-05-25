---
id: US-019
phase: 2.5
status: completed
estimate: 45m
blocks: []
blockedBy: []
priority: medium
risk: medium
---

# US-019 · CONSOLIDATE agent `architect` → `planner` con sección "Architectural Decisions"

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** eliminar el agent `architect` y absorber su rol en `planner`, añadiendo una sección sobre decisiones arquitectónicas
**Para** no tener dos agentes que hacen planificación con scopes solapados

## Contexto extendido

### Evidencia recogida

| Agent | Model | Especialidad |
|---|---|---|
| `architect` | opus | Diseño arquitectónico, planes detallados, análisis de riesgo |
| `planner` | opus | Roadmaps + DAGs + research, asignación de tareas |

**Solapamiento**: ambos generan planes/diseños/decomposiciones. Ambos son Opus (caros). En la práctica, cualquier tarea no trivial cae en uno o en el otro sin criterio claro.

### Diferencia funcional (mínima)

- `architect`: enfoque en estructura, riesgos, decisiones de alto nivel (RFC-style)
- `planner`: enfoque en descomposición en tareas, paralelismo, ejecución

En la práctica:
- Una decisión arquitectónica se puede pedir al planner sin perder valor (planner lee el contexto y aplica el mismo razonamiento)
- Pedirle un roadmap al architect resulta en algo igual al planner
- Las diferencias son de matiz, no de capacidad

### Por qué importa

- **2 agents Opus** para el mismo dominio = doble coste cuando se invocan
- **Triage confuso**: ¿cuándo elegir architect vs planner?
- **Mantenimiento doble**: si los prompts de orquestación cambian, hay que actualizar ambos
- **Reducir agents de 7 a 6** alinea con la dirección del replanteo

## Análisis — pros y contras

### Pros de consolidar

- **Reduce 7 agents → 6** — Commandment X
- **Elimina ambigüedad del triage**: una sola opción para "planificación + decisión arquitectónica"
- **Reduce coste**: si antes en algunos casos se invocaba a ambos (architect → planner), ahora uno solo
- **Coherencia con el patrón del replanteo**

### Contras de consolidar

- **Si el planner pierde el ángulo "architectural risk analysis"**, las decisiones de arquitectura se vuelven más débiles
- **Refactor del prompt del planner**: tiene que cubrir 2 roles → ~30 min trabajo
- **Pérdida de identidad**: el agent `architect` era explícito en su propósito

### Mitigación de contras

- Añadir explícitamente al prompt del planner una sección "Cuándo aplicar análisis arquitectónico" + "Cómo evaluar riesgos"
- Para tareas que claramente sean "RFC / decisión arquitectónica", el planner se invoca con context explícito en el prompt del Lead

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Planner se vuelve "do everything" y pierde foco | Media | Medio | Estructura del prompt: secciones claras para "decomposición" vs "decisión arquitectónica" |
| Calidad de decisiones arquitectónicas baja | Media | Alto | Smoke test con tarea arquitectónica antes de cerrar la historia |
| Otros archivos referencian `architect` por nombre | Alta | Bajo | Grep antes de eliminar |
| El Lead se confunde sobre cuándo invocar planner | Media | Bajo | Actualizar `bootstrap-lead.md` con criterio claro |

## Pasos técnicos detallados

### Paso 1 — Inspeccionar ambos agentes (10 min)

```bash
Read .claude/agents/architect.md
Read .claude/agents/planner.md
```

**Mapear**:
- Tools permitidas (¿son iguales?)
- Prompt principal (qué se le pide al agente)
- Skills referenciadas (¿comparten? — code-quality, planner-protocol, etc.)

### Paso 2 — Diseñar el `planner` ampliado (10 min)

Estructura del prompt del planner ampliado:

```markdown
---
name: planner
description: Planning and decomposition agent. Also handles architectural decisions and risk analysis.
model: opus
tools: [Read, Glob, Grep, WebSearch, WebFetch]
memory: project
---

# Planner

## Roles

### A) Task decomposition (default)
Generate Execution Roadmaps with task-agent-skill assignments.
Break complex tasks into atomic subtasks with dependency DAGs and parallel waves.

### B) Architectural decisions (when requested)
RFC-style analysis: structure, risks, trade-offs, decision rationale.
Used when the Lead invokes with "architectural" or "design" keywords or for complexity >70.

## When to use Mode B (architectural)
- New module / new interface design
- Refactor that changes module boundaries
- Tech stack choice (lib, framework)
- Cross-cutting concern (auth, telemetry, error handling)

## Skills loaded
- planner-protocol
- (optional via Arch H) code-quality (for review of proposed design)
- (optional) decision-stress-test (for stress-testing the decision)
```

### Paso 3 — Implementar el merge (10 min)

```bash
Edit .claude/agents/planner.md   # ampliar prompt con sección Mode B
Bash: rm .claude/agents/architect.md
```

### Paso 4 — Actualizar referencias (5 min)

```bash
Grep "architect" .claude/                    # buscar referencias al agent (cuidado: extension-architect ≠ architect)
Grep "subagent_type.*architect" .claude/     # más específico
Grep "architect" CLAUDE.md
```

Actualizar a `planner` donde corresponda. **Cuidado**: no confundir con `extension-architect` (es otro agent).

### Paso 5 — Actualizar bootstrap-lead.md (3 min)

Si el bootstrap menciona `architect` como opción, actualizar para reflejar que el planner cubre ambos casos.

### Paso 6 — Smoke test (8 min)

1. Tarea de decomposición pura: "Divide en subtareas la migración del módulo X" → planner debe responder con DAG/roadmap
2. Tarea arquitectónica: "Analiza el riesgo de migrar a Bun runtime" → planner debe responder con análisis estructurado (modo B)
3. Verificar que la calidad de la respuesta arquitectónica no es notablemente peor que la del antiguo `architect`

### Paso 7 — Commit (4 min)

```
refactor(agents): consolidate architect into planner (Mode A + Mode B)

- architect agent removed
- planner.md extended with "Architectural decisions" section (Mode B)
- Lead invokes planner for both decomposition and arch decisions
- agents/ count: 7 → 6

Architect functionality preserved via Mode B; planner can handle
both task decomposition and architectural risk analysis.
```

## Criterios de aceptación

- [ ] `.claude/agents/architect.md` no existe
- [ ] `.claude/agents/planner.md` tiene sección Mode A (decomposition) + Mode B (architectural)
- [ ] Smoke test: planner produce decomposición coherente Y análisis arquitectónico coherente
- [ ] `Grep "subagent_type.*architect" .claude/` → 0 resultados que se refieran al agent (no extension-architect)
- [ ] Referencias en bootstrap-lead actualizadas
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado

## Definition of Done

1. Merge realizado
2. Smoke test confirma capacidad arquitectónica preservada
3. Commit con resumen del trade-off
4. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura architect.md y revierte planner.md
```

Trivial.

## Notas

- Si en Paso 1 se descubre que `architect` tiene tools/permissions completamente distintas (e.g. solo Read, no Edit), el merge puede romper la lógica de seguridad
- En ese caso, considerar mantener architect pero **degradar a Sonnet** (de Opus) para reducir coste — alternativa intermedia
- El smoke test del Paso 6 es crítico: si la calidad de Mode B (arch) es notablemente peor, evaluar si el prompt del planner necesita más detalle en la sección arquitectónica

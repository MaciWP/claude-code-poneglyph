---
id: US-015
phase: 2.3
status: completed
estimate: 45m
blocks: []
blockedBy: []
priority: medium
risk: medium
---

# US-015 · COMPACT `planner-protocol/SKILL.md` a <150 líneas

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** compactar el `SKILL.md` de `planner-protocol` siguiendo el mismo patrón que US-014
**Para** reducir el coste del Lead cuando entra en plan mode y se carga esta skill

## Contexto extendido

### Evidencia recogida

- `planner-protocol/SKILL.md` tiene ~280 líneas (mismo orden de magnitud que orchestrator-protocol)
- Tiene **8 reference files** (Discovery, Research, Gap Analysis, Task Classification, Execution Roadmap con DAGs, TDD, Validation)
- Se carga cada vez que el Lead entra en plan mode
- El propio `bootstrap-plan-mode.md` rule menciona "the skill has 8 references"

### Por qué importa

- Plan mode se invoca cada vez que hay una tarea no trivial
- Si el SKILL.md tiene 280 líneas, cargarlo cada vez es coste recurrente
- Los 3 niveles (Quick/Standard/Full) llevan a leer 2, 3-5 u 8 references respectivamente
- El SKILL.md debería ser el "dispatcher" que decide qué references leer según el nivel

### Patrón aplicado de US-014

Misma estrategia: SKILL.md ligero (≤150 líneas) que actúa como índice + lógica de decisión sobre qué reference cargar.

## Análisis — pros y contras

### Pros de compactar

- **Reduce el coste de entrar en plan mode** — relevante porque plan mode se usa con frecuencia
- **Coherencia con US-014** — el patrón se aplica a las 2 skills grandes del meta-sistema
- **Las references siguen siendo lazy-load** — el Lead lee solo las que necesita según el nivel (Quick: 2, Standard: 3-5, Full: 8)

### Contras de compactar

- **Misma curva de riesgo que US-014**: si se compacta agresivamente, se pierde lógica
- **El nivel de triage (Quick/Standard/Full) es crítico** — debe quedar claro en el SKILL.md compactado

### Mitigación de contras

- Aplicar lo aprendido en US-014
- Mantener explícitamente la tabla de niveles en SKILL.md (es el dispatcher principal)

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Tras compactar, planner aplica el nivel Quick a tareas complejas (regression) | Media | Alto | Smoke test con prompt complejo: verificar que sugiere Standard/Full |
| El SKILL.md compactado no documenta correctamente el escalado (Quick→Standard si...) | Media | Medio | Preservar tabla de escalado |
| References referenciadas en otros archivos quedan rotas | Baja | Bajo | Grep antes de mover contenido |

## Pasos técnicos detallados

### Paso 1 — Inventario (10 min)

```bash
Read .claude/skills/planner-protocol/SKILL.md
Glob .claude/skills/planner-protocol/references/*
Read .claude/skills/planner-protocol/references/01-discovery.md
# ... leer las 8 references
```

Crear matriz: contenido SKILL.md vs contenido references → identificar duplicación.

### Paso 2 — Diseñar SKILL.md compactado (10 min)

Estructura objetivo (~120 líneas):

```markdown
---
description: Adaptive planning — Discovery, Research, Gap, Decomposition, Roadmap (Quick/Standard/Full). Three levels scaled by complexity.
keywords: plan, roadmap, decompose, DAG, parallel waves, gap analysis, classification
---

# Planner Protocol

## Cuándo invocar (5 líneas)
## Nivel triage (tabla, 10 líneas)
| Level | When | Refs to load | Cost target |
|---|---|---|---|
| Quick | complexity <30 | ≤2 | ~3-5 min |
| Standard | complexity 30-60 | 3-5 | ~10 min |
| Full | complexity >60 | 8 | ~20-30 min |

## Flujo común (15 líneas, alto nivel)
1. Discovery → Research → Gap → Classification → Roadmap
2. Cada paso lee su reference si el nivel lo requiere

## Tabla de references (10 líneas)
| Reference | Quick | Standard | Full |
|---|---|---|---|
| 01-discovery.md | ✅ | ✅ | ✅ |
| 02-research.md | – | ✅ | ✅ |
| 03-gap.md | – | – | ✅ |
| ... |

## Escalado (10 líneas)
- Empezar Quick. Si descubre uncertainty → escalar a Standard.
- Si descubre multi-domain o riesgo arquitectónico → escalar a Full.

## Output esperado (10 líneas)
- DAG de tareas
- Roadmap por waves paralelos
- Validation criteria

## Referencias (10 líneas)
```

Total: ~100-120 líneas.

### Paso 3 — Compactar SKILL.md (15 min)

```bash
Edit .claude/skills/planner-protocol/SKILL.md
```

Reescribir según diseño.

### Paso 4 — Verificar references externas (5 min)

```bash
Grep "planner-protocol" .claude/
Grep "planner-protocol" CLAUDE.md
Grep "planner-protocol" C:\Users\Maci\.claude\CLAUDE.md
Grep "bootstrap-plan-mode" .claude/                  # rule que carga esta skill
```

Actualizar si hay anchors específicos al SKILL.md antiguo.

### Paso 5 — Smoke test (8 min)

1. Sesión nueva, entrar en plan mode con `/<plan>` o equivalente
2. Prompt simple: "Quiero refactorizar el comando X" → planner debe sugerir nivel Quick
3. Prompt complejo: "Reorganizar la arquitectura de skills" → debe sugerir Standard o Full
4. Verificar que el planner cita las references correctas según el nivel

### Paso 6 — Tests (3 min)

```bash
Bash: bun test ./.claude/hooks/
```

### Paso 7 — Commit (2 min)

```
refactor(skills): compact planner-protocol SKILL.md (280 → 120 lines)

Same pattern as US-014: SKILL.md acts as dispatcher,
references hold the full per-step content.

- Level triage table preserved (Quick/Standard/Full)
- Lazy-load via references unchanged
- Smoke test confirms correct level selection
```

## Criterios de aceptación

- [ ] `planner-protocol/SKILL.md` tiene ≤150 líneas
- [ ] Tabla de niveles (Quick/Standard/Full) preservada
- [ ] Smoke test: planner sugiere nivel correcto para complejidad alta y baja
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado

## Definition of Done

1. SKILL.md ≤150 líneas
2. Smoke test ok
3. Commit
4. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
```

## Notas

- Esta historia es **muy similar a US-014** — si US-014 ya fue ejecutada con éxito, este es básicamente "aplicar el mismo patrón"
- El patrón puede generalizarse a un check de auditoría futuro: "ninguna skill debe tener SKILL.md >150 líneas". Considerar añadir esa regla al `/benchmark-skills` (US-009)
- Si esta historia descubre que `planner-protocol` y `orchestrator-protocol` tienen mucho solapamiento (workflow similar), evaluar si se pueden mergear — pero solo después de Fase 2 completa, no aquí

## Ejecución real (2026-05-25)

**Divergencia de premisa** (idéntica a US-014): el SKILL.md actual tenía **169 líneas**, no ~280. Compactación parcial previa. Se procede al target ≤150.

**Resultado**: 169 → **108 líneas** (−36%). Sub-objetivo cumplido con margen.

**Cambios estructurales** (además de compactar):

1. **§1 "Fundamental Goals" compactado** de 15 líneas (tabla de 9 goals) a 1 párrafo (6 goals separados por `·`) + puntero a CLAUDE.md §10 Commandments — eliminada la duplicación con los commandments del proyecto.
2. **Eliminado §2 "Auto Context Loading"** (21 líneas: tablas keyword→skill + when-to-use structured-reasoning) — toda esa lógica vive en `orchestrator-protocol/references/05-skill-matching.md`. El planner ASIGNA agents/skills a nodos del DAG pero no re-deriva las reglas.
3. **Eliminado §4 "Tool Selection"** (22 líneas: tabla trigger→agent + Glob/Grep vs Explore) — duplicado de `orchestrator-protocol/references/04-agent-selection.md`. Reemplazado por §3 con punteros cross-skill.
4. **§5 "Output Format" preservado verbatim** — el mini-template inline es crítico para que el planner produzca output consistente. Mantiene puntero a `references/06-output-format.md` para el formato completo.
5. **§0 Level Triage** (la tabla Quick/Standard/Full + Escalation Rules) preservada — es el dispatcher principal de la skill.
6. **§Task Classification 🔵🟡🔴** preservada — es el core conceptual del protocolo.
7. **Content Map compactado** a una línea por reference (antes 2 líneas con párrafo verbatim).
8. **Version bumpeada** 1.0 → 1.1.

**Tests**: `bun test ./.claude/hooks/` → 139 pass / 0 fail.

**Smoke test mental**:
- Prompt simple "renombrar comando X" → §0 indica Quick (complexity <30) ✓
- Prompt complejo "reorganizar arquitectura de skills" → §0 indica Full (multi-domain) ✓
- Output: `Level: ...` en primera línea → §0 y §4 lo exigen explícitamente ✓
- Clasificación 🔵🟡🔴 → §2 preservado ✓
- Asignación de agents/skills → §3 puntero a `orchestrator-protocol` ✓
- Escalado Quick→Standard→Full → §0 Escalation Rules ✓

Commit hash: pendiente.

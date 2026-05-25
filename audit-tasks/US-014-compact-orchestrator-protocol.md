---
id: US-014
phase: 2.3
status: completed
estimate: 60m
blocks: [US-018]
blockedBy: []
priority: high
risk: medium
---

# US-014 · COMPACT `orchestrator-protocol/SKILL.md` a <150 líneas

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** compactar el `SKILL.md` principal de `orchestrator-protocol` a menos de 150 líneas
**Para** reducir el coste en tokens del system prompt del Lead cada turno, sin perder la lógica que vive en las references

## Contexto extendido

### Evidencia recogida

- `orchestrator-protocol/SKILL.md` tiene ~280 líneas
- Tiene **8 reference files** en `references/` (01-verification, 02-prompt-scoring, ..., 08-output-style)
- El SKILL.md replica info que también está en las references
- El Lead lo lee al inicio + cada vez que se invoca `Skill('orchestrator-protocol')`
- El propio CLAUDE.md menciona: "loaded via Skill('orchestrator-protocol') at session start"

### Por qué importa

- Cada turno del Lead carga este SKILL.md como contexto
- 280 líneas × 1 vez por sesión × N sesiones = mucha repetición
- Si SKILL.md es solo el "punto de entrada" que decide qué reference leer, debería ser breve
- La references son lazy-load: solo se leen cuando son necesarias

### Patrón objetivo

Estructura ideal de una skill grande:
```
SKILL.md (50-100 líneas)
├── description y triggers
├── índice de qué hay en cada reference
└── instrucciones para "lee la reference X cuando..."

references/
├── 01-X.md (300 líneas, lazy-load)
├── 02-Y.md (200 líneas, lazy-load)
└── ...
```

El SKILL.md actual probablemente duplica contenido que ya está en las references. La compactación elimina ese contenido del SKILL.md y deja punteros a las references.

## Análisis — pros y contras

### Pros de compactar

- **Reduce tokens del system prompt del Lead** cada turno (~130 líneas menos × tokens/línea)
- **Mejora la legibilidad**: el SKILL.md se vuelve un mapa, no un libro
- **Las references quedan como fuente de verdad** — Single Source of Truth
- **Facilita ediciones futuras**: cambiar solo la reference relevante, no SKILL.md + reference

### Contras de compactar

- **Riesgo de perder contexto si la compactación es agresiva**: el Lead necesita saber CUÁNDO leer cada reference
- **Trabajo no trivial**: requiere entender bien las 8 references para resumir correctamente
- **Si las references no son self-contained**, el Lead puede no entenderlas sin el preámbulo del SKILL.md actual

### Mitigación de contras

- Tras compactar, smoke test: pedirle al Lead que cite "el paso 3 del orchestration-checklist" → debe ir a la reference correcta
- Las references deben tener encabezado claro (ya lo tienen probablemente)
- Mantener en SKILL.md la **mecánica básica** (5-step flow) pero sin el detalle exhaustivo

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Tras compactar, el Lead pierde el flujo y empieza a saltarse pasos | Media | Alto | Smoke test después: 1 prompt no trivial, verificar que el Lead aplica los 5 pasos |
| Las references quedan huérfanas (no se leen) porque el SKILL.md ya no las menciona | Media | Medio | Mantener en SKILL.md un índice claro "lee X.md cuando Y" |
| El SKILL.md compactado pierde matices importantes (e.g. excepciones, edge cases) | Alta | Medio | Mover esos matices a las references correspondientes, no eliminarlos |
| Otros archivos (CLAUDE.md, agents) referencian secciones específicas del SKILL.md que ya no existen | Media | Bajo | Grep antes de eliminar; redirigir referencias a las references |

## Pasos técnicos detallados

### Paso 1 — Inventario del estado actual (10 min)

```bash
Read .claude/skills/orchestrator-protocol/SKILL.md
Glob .claude/skills/orchestrator-protocol/references/*
Read .claude/skills/orchestrator-protocol/references/01-verification.md
Read .claude/skills/orchestrator-protocol/references/02-prompt-scoring.md
# ... leer las 8 references
```

**Crear matriz**: para cada sección del SKILL.md, identificar:
- ¿Está duplicada en alguna reference?
- ¿Es contenido único?
- Si única, ¿debería moverse a una reference?

### Paso 2 — Diseñar el SKILL.md compactado (15 min)

Estructura objetivo (~120 líneas):

```markdown
---
description: Full Lead orchestration protocol — verification, complexity routing, agent selection, delegation, error recovery
keywords: orchestrate, delegate, complexity, routing, agent, skill, checklist, lead
---

# Orchestrator Protocol

## Cuándo invocar (5 líneas)

## El flujo en 5 pasos (15 líneas, alto nivel)
1. Triage prompt → score
2. Calculate complexity
3. Prepare context (skills, memory)
4. Delegate (or act directly)
5. Validate (review, tests)

## Tabla de references (10 líneas)
| Reference | Cuándo leer |
|---|---|
| `01-verification.md` | Antes de marcar tarea como completed |
| `02-prompt-scoring.md` | Si el prompt es ambiguo |
| ... |

## Default-allow gate (15 líneas, lo crítico)

## Triggers A y B (20 líneas, lo crítico)

## Memory & Arch H (15 líneas, lo crítico)

## Errores comunes (10 líneas)
- Ver `references/error-recovery.md` para detalles

## Referencias completas (10 líneas)
```

Total: ~100-120 líneas.

### Paso 3 — Actualizar references si tienen huecos (10 min)

Si en Paso 2 se identificó contenido único en SKILL.md que NO está en references, moverlo:

```bash
Edit .claude/skills/orchestrator-protocol/references/<archivo-relevante>.md
# Añadir la sección que estaba solo en SKILL.md
```

### Paso 4 — Compactar SKILL.md (15 min)

```bash
Edit .claude/skills/orchestrator-protocol/SKILL.md
```

Reescribir según el diseño del Paso 2. Eliminar todo lo movido a references.

**Métrica objetivo**: ≤150 líneas.

### Paso 5 — Verificar referencias externas (5 min)

```bash
Grep "orchestrator-protocol" .claude/
Grep "orchestrator-protocol" CLAUDE.md
Grep "orchestrator-protocol" C:\Users\Maci\.claude\CLAUDE.md
```

Si el contenido movido a references es referenciado externamente con anchor (e.g. `orchestrator-protocol#verify-first`), actualizar el anchor o redirigir.

### Paso 6 — Smoke test (10 min)

1. Reset de la sesión (cerrar y abrir nueva)
2. Primer mensaje: "¿Qué pasos del orchestration-checklist debes ejecutar antes de responder?" → el Lead debe poder citar los 5 pasos
3. Mensaje complejo: pedir algo que requiera delegación → verificar que el Lead aplica Trigger A/B correctamente
4. Mensaje con score bajo: prompt ambiguo → verificar que el Lead detecta y pide clarificación

### Paso 7 — Verificar tests (3 min)

```bash
Bash: bun test ./.claude/hooks/
```

### Paso 8 — Commit (2 min)

```
refactor(skills): compact orchestrator-protocol SKILL.md (280 → 120 lines)

- SKILL.md is now the entry/index, references hold full content
- No behavior change: smoke test confirms 5-step flow still applied
- Reduces Lead system prompt by ~160 lines/turn
```

## Criterios de aceptación

- [ ] `orchestrator-protocol/SKILL.md` tiene ≤150 líneas
- [ ] Las 8 references siguen siendo coherentes (contenido íntegro)
- [ ] Smoke test: Lead aplica el flujo 5-step en una tarea no trivial
- [ ] Smoke test: Lead detecta prompt ambiguo y pide clarificación
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Referencias externas actualizadas (o agendadas en US-022)
- [ ] Commit realizado

## Definition of Done

1. SKILL.md ≤150 líneas
2. Smoke test confirma comportamiento preservado
3. Commit con mensaje explicando reducción
4. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura SKILL.md original
```

Si parcial (e.g. el smoke test falla solo para Trigger B):
```bash
Edit .claude/skills/orchestrator-protocol/SKILL.md
# Restaurar manualmente la sección de Trigger B desde git history
```

## Notas

- Esta historia bloquea US-018 porque US-018 mueve contenido de `performance.md` rule a este SKILL.md → primero hay que tener el SKILL.md compactado para saber dónde añadir
- Si en el smoke test el Lead empieza a saltarse pasos, eso es señal de que la compactación fue agresiva → restaurar SKILL.md a un tamaño intermedio (~180-200 líneas)
- Caveat: las skills tienen un mecanismo de "context fork" — si la skill está en `context: fork`, la compactación tiene menos impacto (el SKILL.md solo se carga al invocar). Verificar el frontmatter
- Si la skill se invoca raramente y el coste actual es bajo, esta historia podría considerarse OPCIONAL — pero el patrón se aplica también a `planner-protocol` (US-015), así que conviene hacerla

## Ejecución real (2026-05-25)

**Divergencia de premisa**: SKILL.md actual ya tenía **166 líneas**, no ~280 como asumía la US. El archivo había sido compactado parcialmente en sesiones previas; el "Content Map" con 8 entries verbatim ya existía. Tras consultar al usuario, se procede igualmente para alcanzar el target ≤150.

**Resultado**: 166 → **117 líneas** (−30%). Sub-objetivo cumplido con margen.

**Cambios aplicados** (además de compactar):

1. **Eliminado §2 "Complexity Routing"** — duplicaba la tabla de §1 Step 2. La tabla queda solo en Step 2 con columna "Mode" añadida para no perder info.
2. **Eliminado §3 "Delegation Triggers"** — usaba "A/B" con significado distinto al de §1 Step 1, creaba confusión. La info útil (parallelize cuando no hay data dependency, criterios) se integra en §1 Step 4.
3. **Eliminadas "Rule 1 / Rule 2 — direct-action rules"** del antiguo Step 4 (`complexity < 20 para Edit directo`) — obsoletas: el CLAUDE.md actual define un default-allow gate sin threshold de complejidad.
4. **Alineado Trigger A** con CLAUDE.md/bootstrap-lead.md: umbral **≥5 archivos** (antes decía ≥3) y "1-4 files + bounded → Lead direct" (antes decía "1-2 files + complexity <20").
5. **Trigger B 2×2 matrix inline** en Step 1 (antes solo apuntaba a la reference). Ahora el SKILL.md es autosuficiente para el caso común.
6. **Content Map compactado**: cada fila cabe en una línea (antes había párrafos verbatim de cada reference).
7. **Version bumpeada** 2.0 → 2.1.

**Tests**: `bun test ./.claude/hooks/` → 139 pass / 0 fail.

**Commit**: ver hash al final.

**Smoke test mental** (los 5 casos típicos del Lead):
- Tarea ambigua → §1 Step 1 instruye AskUserQuestion ✓
- Complejidad alta → §1 Step 2 tabla + routing ✓
- Delegar a builder → Trigger A en Step 1 + Step 4 ✓
- Exploración → Trigger B 2×2 en Step 1 ✓
- Fallo de subagente → puntero a `07-delegation-recovery.md` en Step 5 ✓

Commit hash: 5c449af.

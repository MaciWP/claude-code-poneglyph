---
id: US-011
phase: 2.3
status: completed
estimate: 90m
blocks: [US-020]
blockedBy: []
priority: high
risk: medium
---

# US-011 · MERGE 3 skills de review en una sola `review-patterns --mode=...`

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** consolidar `code-quality`, `security-review` y `performance-review` en una sola skill `review-patterns` con flag `--mode`
**Para** eliminar 3 estructuras paralelas con boilerplate duplicado y centralizar el conocimiento de "auditoría de código"

## Contexto extendido

### Evidencia recogida

| Skill | Líneas | Función |
|---|---|---|
| `code-quality` | ~200 | SOLID, DRY, refactoring, code smells, complexity |
| `security-review` | ~200 | OWASP Top 10, injection, secrets, auth, CSRF/XSS |
| `performance-review` | ~200 | Bottlenecks, memory leaks, N+1, profiling |

Las 3 skills:
- Tienen la **misma estructura** (description, triggers, patterns, ejemplos)
- Comparten **boilerplate de invocación** (cuándo activarse, cómo reportar)
- Se invocan en **contextos similares** (revisión de código, audit, pre-commit)
- En el agent `reviewer` se referencian las 3 — el agente carga las 3 a la vez

### Por qué importa

- **3 archivos × ~200 líneas = ~600 líneas** que probablemente comparten 30% de boilerplate
- **Descripciones de 3 skills en system prompt** vs 1 skill con flag → menos ruido de matching
- **Cuando se invoca `reviewer`**, las 3 skills se cargan vía Arch H — son ~30K tokens combinados
- **Mantenimiento**: si la estructura de "cómo reportar un finding" mejora, hay que actualizar 3 archivos en vez de 1

### Diseño merged sugerido

```
.claude/skills/review-patterns/SKILL.md
├── description: Code review patterns. Modes: quality (SOLID/DRY), security (OWASP), performance (N+1, leaks)
├── triggers: review, quality, security, owasp, performance, leak, ...
└── references/
    ├── 01-mode-quality.md         (contenido de code-quality)
    ├── 02-mode-security.md        (contenido de security-review)
    └── 03-mode-performance.md     (contenido de performance-review)

Uso:
- skill se activa por keyword
- Si el contexto sugiere modo específico (e.g. "OWASP" → security), el agente lee solo esa reference
- Si es revisión general, lee las 3 references
```

## Análisis — pros y contras

### Pros del merge

- **Reduce 3 carpetas a 1** — Commandment X
- **Descripción única en system prompt** — menos noise para el matching
- **Mejora la lógica de invocación**: en vez de "carga 3 skills" → "carga 1 skill con sus references según `--mode`"
- **Facilita añadir nuevos modos**: e.g. `--mode=accessibility`, `--mode=i18n` = nueva reference
- **Reduce ~30% boilerplate** estimado (estructuras comunes deduplicadas)

### Contras del merge

- **Trabajo no trivial**: 90 min reales si las 3 skills divergen mucho en estructura
- **Pérdida de granularidad**: si quieres referenciar "code-quality" como concepto distinto, el merge lo difumina
- **Riesgo de bloat en la skill merged**: si la sumatoria es ~600 líneas, la skill nueva sigue siendo grande
- **Triggers del agente `reviewer`** referencian las 3 skills explícitamente → hay que actualizar

### Mitigación de contras

- Usar **references separadas por modo** dentro de la carpeta merged → mantiene granularidad sin duplicación
- Para el bloat: la skill principal `SKILL.md` tiene ~80 líneas (description + matching), las references son lazy-load
- Update del agent `reviewer` es parte de esta historia (no separar)

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Las 3 skills tienen estructuras tan distintas que el merge produce un skill incoherente | Media | Medio | Diff estructural antes de mergear; si divergen mucho, abortar |
| El agente `reviewer` deja de funcionar tras update de referencias | Media | Alto | Smoke test: delegar al reviewer una tarea pequeña; verificar que el reporte se mantiene |
| Se pierde alguna sección útil de las skills originales | Alta | Bajo | Diff a mano antes de eliminar las skills originales; mantener originales en git history para recuperar |
| Triggers del skill merged son tan amplios que se auto-activa siempre | Media | Bajo | Triggers específicos por modo, no superpuestos genéricos |

## Pasos técnicos detallados

### Paso 1 — Inspeccionar las 3 skills (15 min)

```bash
Read .claude/skills/code-quality/SKILL.md
Read .claude/skills/security-review/SKILL.md
Read .claude/skills/performance-review/SKILL.md

Glob .claude/skills/code-quality/references/*       # archivos extra si hay
Glob .claude/skills/security-review/references/*
Glob .claude/skills/performance-review/references/*
```

Mapear cada skill:
- ¿Cuál es la "entrada" (description, triggers)?
- ¿Qué contenido único tiene?
- ¿Qué boilerplate comparten?

### Paso 2 — Diseñar la skill merged (15 min)

Estructura propuesta:
```
.claude/skills/review-patterns/
├── SKILL.md                         (entrada principal — description, triggers, cómo elegir modo)
├── references/
│   ├── 01-mode-quality.md           (SOLID, DRY, refactoring)
│   ├── 02-mode-security.md          (OWASP, secrets, auth)
│   └── 03-mode-performance.md       (N+1, memory, profiling)
└── examples/                        (si las skills originales tienen ejemplos)
```

Frontmatter del SKILL.md merged:
```yaml
---
description: Code review patterns. Modes: quality (SOLID, DRY, smells), security (OWASP Top 10, secrets), performance (bottlenecks, leaks, N+1). Activate by keyword; agent reads relevant mode reference.
keywords: review, code quality, SOLID, DRY, complexity, OWASP, security, vulnerability, injection, secrets, performance, bottleneck, memory, N+1, leak
---
```

### Paso 3 — Crear la nueva skill (25 min)

```bash
Write .claude/skills/review-patterns/SKILL.md         (~80-100 líneas, alto nivel)
Write .claude/skills/review-patterns/references/01-mode-quality.md     (extraído de code-quality)
Write .claude/skills/review-patterns/references/02-mode-security.md    (extraído de security-review)
Write .claude/skills/review-patterns/references/03-mode-performance.md (extraído de performance-review)
```

**En cada reference**: solo el contenido único (patrones, ejemplos), eliminar boilerplate redundante.

### Paso 4 — Eliminar las 3 skills originales (5 min)

```bash
Bash: rm -rf .claude/skills/code-quality
Bash: rm -rf .claude/skills/security-review
Bash: rm -rf .claude/skills/performance-review
```

### Paso 5 — Actualizar referencias en agents y rules (10 min)

```bash
Grep "code-quality" .claude/agents/        # agent `reviewer` y posiblemente `architect`
Grep "security-review" .claude/agents/
Grep "performance-review" .claude/agents/
Grep "code-quality" .claude/rules/
```

Actualizar en cada archivo identificado:
- `code-quality` → `review-patterns` (modo quality)
- `security-review` → `review-patterns` (modo security)
- `performance-review` → `review-patterns` (modo performance)

Mantener semánticamente la intención (qué modo le interesa al agent).

### Paso 6 — Smoke test (10 min)

1. Mensaje al Lead: "Hazle un code review a `.claude/hooks/security-gate.ts` enfocándote en seguridad" → debe activarse skill `review-patterns` y el agent debe leer la reference de security
2. Mensaje al Lead: "Revisa performance de este loop" → debe activar skill y leer reference de performance
3. Verificar que el reporte resultante tiene la calidad de las skills originales (no es peor)

### Paso 7 — Verificar tests (5 min)

```bash
Bash: bun test ./.claude/hooks/
```

Si hay tests específicos de las skills (no hooks): verificar carpetas.

### Paso 8 — Commit (5 min)

```
refactor(skills): merge 3 reviews into review-patterns with mode flag

- Removed: skills/code-quality, security-review, performance-review (3 × ~200 lines)
- Added: skills/review-patterns/ with SKILL.md + 3 mode references
- Updated agents/reviewer.md to reference review-patterns
- Net reduction: ~600 → ~400 lines (-33%); 3 skills → 1 in system prompt

Behavior preserved: agent reads relevant mode reference based on keyword context.
```

## Criterios de aceptación

- [ ] `.claude/skills/review-patterns/` existe con SKILL.md + 3 references
- [ ] `.claude/skills/{code-quality,security-review,performance-review}/` no existen
- [ ] `Grep "code-quality" .claude/` → solo referencias a la reference `01-mode-quality.md` o cero
- [ ] `Grep "security-review" .claude/` → solo a reference, cero referencias huérfanas
- [ ] `Grep "performance-review" .claude/` → idem
- [ ] Agent `reviewer` actualizado para referenciar `review-patterns`
- [ ] Smoke test: review funciona para los 3 modos
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado

## Definition of Done

1. Skill merged creada y funcional
2. Skills originales eliminadas
3. Referencias en agents/rules actualizadas
4. Smoke test ok para los 3 modos
5. Commit con descripción del trade-off (-200 líneas estimadas, +modularidad)
6. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura las 3 skills + referencias en agents
```

Si parcial (e.g. una reference se perdió):
```bash
git show <hash>:.claude/skills/code-quality/SKILL.md > .claude/skills/review-patterns/references/01-mode-quality.md
# Re-adaptar contenido
```

## Notas

- Si en Paso 1 se descubre que las 3 skills divergen demasiado en estructura (e.g. security tiene un workflow propio totalmente distinto), evaluar mantener security-review por separado y mergear solo quality + performance
- En ese caso, esta historia se cierra como MERGE PARCIAL con justificación
- US-020 (absorber meta-create en extension-architect) bloquea por esta historia porque la lógica de "absorber skills en X" se aprende aquí — el mismo patrón se aplicará a las skills meta-create
- El agent `reviewer` tiene la lista de skills hardcodeada en su frontmatter — verificar que esa lista se actualiza correctamente, no solo el contenido del prompt

---

## Execution closure

**Resultado**: MERGE PARCIAL (scope ajustado 3→2 — cláusula activada de la sección Notas).

**Commit**: `0ce423b refactor(skills): partial merge code-quality + performance-review -> review-patterns`.

**Scope final**:
- `code-quality` + `performance-review` → fusionadas en `review-patterns` con dos modos (quality, performance).
- `security-review` → **NO fusionada**. Razón empírica: tiene features únicas (paths auto-activation, mapa OWASP A01-A10, tabla regex de secretos, sección emergency) que justifican mantenerse separada. El intento original ("3 skills × ~200 líneas = ~600") subestimó: el contenido real era ~100 KB porque cada skill tiene checklists/, evals/, scripts/, references/ con material distinto, no boilerplate duplicado.

**Estructura final** (`.claude/skills/review-patterns/`):
- `SKILL.md` (113 líneas) — routing entry + mode selection + shared severity + scripts table
- `references/01-mode-quality.md` (152 líneas) — body del modo quality
- `references/02-mode-performance.md` (96 líneas) — body del modo performance
- `references/quality/` (9 files) — SOLID, complexity, anti-patterns, extracts (preservados de code-quality)
- `references/performance/` (2 files) — N+1, memory leaks (preservados de performance-review)
- `checklists/`, `templates/`, `scripts/`, `evals/` (paths actualizados, contenido preservado)

**Cross-references actualizadas** (13 archivos): `reviewer.md`, `planner.md`, `builder.md`, `orchestrator-protocol/references/{04,05,06}`, `decision-stress-test/SKILL.md`, `explain-changes/SKILL.md` + `interaction-patterns.md`, `workflows/refactor.md`, `docs/arch-h-lead-directed-skill-reads.md`. `evals[].skills` field migrado.

**Frontmatter del reviewer**: skills va de 4 → 3 (`review-patterns + security-review + anti-hallucination`). Context budget total preservado (6).

**Tests**: 139/139 hooks pass.

**Implicaciones para US-020**: el patrón "absorber funcionalidad en una unidad" queda documentado. US-020 puede aplicar el mismo enfoque (extension-architect absorbe templates de meta-create), pero conviene auditar primero el tamaño real para evitar el mismo error de subestimación.

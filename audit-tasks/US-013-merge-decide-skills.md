---
id: US-013
phase: 2.3
status: rejected
estimate: 60m
blocks: []
blockedBy: []
priority: medium
risk: medium
---

# US-013 · MERGE `decide` + `decision-stress-test` → `decide --depth=shallow|deep`

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** consolidar las skills `decide` y `decision-stress-test` en una sola con flag de profundidad
**Para** no tener dos skills que hacen lo mismo a distinta escala

## Contexto extendido

### Evidencia recogida

| Skill | Líneas | Perspectivas | Coste contexto estimado |
|---|---|---|---|
| `decide` | ~140 | 3 (Pragmatist, Innovator, Critic) | ~2K tokens |
| `decision-stress-test` | ~260 | 5-12 + 5 adversarial techniques | ~3.5K tokens |

**Misma función**: ayudar a Oriol a tomar una decisión multi-perspectiva.
**Distinto coste**: decide es rápido y barato; decision-stress-test es exhaustivo y caro.

### El flag como solución natural

```
ANTES:
Skill('decide')                  → 3 perspectivas
Skill('decision-stress-test')    → 12 perspectivas + adversarial

DESPUÉS:
Skill('decide')                  → default shallow (3 perspectivas)
Skill('decide', depth='deep')    → 12 perspectivas + adversarial
```

Una skill, un flag, el usuario elige la profundidad según importancia de la decisión.

### Por qué importa

- **Dos skills hacen "la misma cosa"** — Commandment X
- **Trigger overlap**: cualquier "ayúdame a decidir" puede activar una u otra → ambigüedad
- **Coste oculto**: si se invoca `decision-stress-test` por error en una decisión trivial, gastas 5x más tokens innecesariamente
- **Mantenimiento**: mejoras a una de las dos rara vez se propagan a la otra

### Caso especial: ¿son realmente la misma cosa?

Verificar en Paso 1 si:
- Los workflows son idénticos a distinta escala (perfecto merge)
- Los workflows divergen en estructura (e.g. stress-test añade pre-mortem que decide no tiene) → el merge debe preservar las técnicas adversariales como subflows del modo `deep`
- Los workflows son fundamentalmente distintos (decide = decisión rápida, stress-test = challenge profundo) → considerar mantenerlas o renombrar para diferenciarlas mejor

## Análisis — pros y contras

### Pros del merge

- **Una skill en vez de dos** — menos descriptors en system prompt
- **Trigger único** elimina ambigüedad — el usuario / el sistema elige `depth` explícitamente
- **Mantenimiento centralizado**: mejoras al workflow llegan a ambos modos
- **Pedagogía**: el usuario aprende un solo concepto ("decide tiene un dial de profundidad")
- **Menor riesgo de invocar el caro por error**: shallow es default, deep es opt-in

### Contras del merge

- **Si los workflows divergen estructuralmente**, forzarlos en una skill genera bloat
- **Pérdida de identidad**: "stress-test" como nombre era explícito sobre la naturaleza adversarial; "decide --depth=deep" suena más blando
- **Refactor del archivo**: 60 min reales para hacerlo bien

### Mitigación de contras

- Estructura merged: SKILL.md ligero + references por modo (similar a US-011 con reviews)
- El nombre "stress-test" puede preservarse como alias: `Skill('decide', mode='stress-test')` equivalente a `depth='deep'`

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El modo `deep` se invoca por defecto por error y gasta tokens | Media | Medio | Default explícito = shallow; deep requiere flag explícito |
| Triggers del merged son tan amplios que se activa para cualquier "decisión" | Media | Bajo | Triggers específicos a "decisión técnica importante" |
| Stress-test tenía lógica única (e.g. 5 técnicas adversariales) que se diluye | Media | Medio | Preservar como reference dedicada (`references/02-deep-mode.md`) |
| Usuario invoca "decision-stress-test" por costumbre y no encuentra | Alta | Bajo | Documentar el cambio en CLAUDE.md (US-022) |

## Pasos técnicos detallados

### Paso 1 — Inspeccionar ambas skills (15 min)

```bash
Read .claude/skills/decide/SKILL.md
Read .claude/skills/decision-stress-test/SKILL.md
Glob .claude/skills/decide/references/*               # si existen
Glob .claude/skills/decision-stress-test/references/*
```

**Mapear**:
- Estructura común (perspectivas, voting, conclusión)
- Estructura única de stress-test (adversarial: pre-mortem, steel-man, inversion, second-order, assumption audit)
- Triggers de cada uno

### Paso 2 — Diseñar la skill merged (10 min)

Estructura:
```
.claude/skills/decide/
├── SKILL.md
├── references/
│   ├── 01-shallow-mode.md    (3 perspectivas: Pragmatist, Innovator, Critic)
│   └── 02-deep-mode.md       (5-12 perspectivas + 5 adversarial techniques)
└── (eliminado: .claude/skills/decision-stress-test/)
```

Frontmatter:
```yaml
---
description: |
  Decision-making skill. Modes:
  - shallow (default): 3 perspectives (Pragmatist, Innovator, Critic)
  - deep: 5-12 perspectives + 5 adversarial techniques (steel-man, pre-mortem, assumption audit, inversion, second-order effects)
keywords: decide, decision, choose, evaluate, trade-off, stress-test, challenge, devils-advocate, contrarian, pre-mortem
---
```

En SKILL.md:
```
## Uso
- "Ayúdame a decidir entre X e Y" → mode=shallow (por defecto)
- "Stress-testea esta decisión" / "challenge antes de decidir" → mode=deep
- Argumento explícito: Skill('decide', args='depth=deep')
```

### Paso 3 — Crear las references (15 min)

```bash
Write .claude/skills/decide/references/01-shallow-mode.md
# contenido extraído de decide/SKILL.md original (las 3 perspectivas y su workflow)
```

```bash
Write .claude/skills/decide/references/02-deep-mode.md
# contenido extraído de decision-stress-test/SKILL.md (12 perspectivas + adversarial)
```

### Paso 4 — Actualizar SKILL.md de decide (10 min)

Reescribir para que sea la entrada que orquesta los dos modos:
```bash
Edit .claude/skills/decide/SKILL.md
```

Contenido típico (~80 líneas):
- description (con keywords amplias cubriendo ambos contextos)
- Cuándo activar: triggers
- Cuándo elegir shallow vs deep (criterios)
- Instrucción de leer la reference correspondiente

### Paso 5 — Eliminar `decision-stress-test` (3 min)

```bash
Bash: rm -rf .claude/skills/decision-stress-test
```

### Paso 6 — Buscar y actualizar referencias (5 min)

```bash
Grep "decision-stress-test" .claude/
Grep "stress-test" .claude/
```

Updates:
- Si CLAUDE.md o algún agent menciona `decision-stress-test`, marcar para US-022
- Si comando `/decide` existía y mencionaba el modo deep, actualizar (relacionado con US-008)

### Paso 7 — Smoke test (10 min)

1. "Ayúdame a decidir entre Bun y Node" → debe activar `decide` en modo shallow (3 perspectivas)
2. "Stress-testea la decisión de migrar a Bun" → debe activar `decide` en modo deep
3. "Tengo que tomar una decisión arquitectónica importante, dame pre-mortem" → debe activar `decide` en modo deep (keyword pre-mortem)

### Paso 8 — Commit (2 min)

```
refactor(skills): merge decision-stress-test into decide with depth flag

- decide/references/01-shallow-mode.md: 3 perspectives (default)
- decide/references/02-deep-mode.md: 12 perspectives + 5 adversarial techniques
- Single skill, single trigger surface, opt-in deep mode

Behavior preserved:
- Shallow (default): cheap and fast
- Deep (explicit): full stress-test with steel-man, pre-mortem, inversion, second-order, assumption audit
```

## Criterios de aceptación

- [ ] `.claude/skills/decide/` contiene SKILL.md + 2 references
- [ ] `.claude/skills/decision-stress-test/` no existe
- [ ] `Grep "decision-stress-test" .claude/` → 0 resultados (o solo referencias documentales agendadas)
- [ ] Smoke test pasa: ambos modos se activan correctamente según el prompt
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado

## Definition of Done

1. Skill merged creada con 2 references
2. `decision-stress-test` eliminada
3. Referencias huérfanas listadas (US-022 si CLAUDE.md raíz)
4. Smoke test ok para shallow y deep
5. Commit
6. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura ambas skills por separado
```

Si parcial:
```bash
git show <hash>:.claude/skills/decision-stress-test/SKILL.md > .claude/skills/decide/references/02-deep-mode.md
# Re-adaptar
```

## Notas

- Si Paso 1 revela que `decision-stress-test` tiene un mecanismo único de "rondas de cross-debate" entre perspectivas (mencionado en su description: "with cross-debate rounds, plus 5 adversarial techniques"), preservarlo como sección dentro de `02-deep-mode.md` — NO simplificarlo
- El flag `depth=` puede expandirse en el futuro a más niveles (e.g. `depth=ultra` con 20+ perspectivas) sin tocar la arquitectura
- El comando `/decide` (si no fue cortado en US-008) podría aceptar el flag: `/decide --depth=deep "elegir entre X e Y"`

---

## Execution closure — REJECTED

**Veredicto**: REJECTED con justificación. Paralelo a US-008 (que también se cerró rechazada tras inspección).

### Razones empíricas tras leer ambas skills

1. **Workflows estructuralmente distintos, no escalares**:
   - `decide`: 5 pasos lineales (brief → 3 perspectivas en paralelo → síntesis → HTML memo → resumen). 142 líneas de SKILL.md + un template HTML. Salida visual.
   - `decision-stress-test`: 5 fases con Cross-Debate Step-back Judge (Phase 2), Validation Gate blocking (Phase 4), Per-Perspective Vote (Phase 5), Self-Meta Check, 17 anti-patterns. 293 líneas + 6 references + 4 prompt files (~1500 líneas totales). Salida estructurada con vote tally + dissents verbatim.
   - Forzar ambos en `decide --depth` genera bloat en SKILL.md y complica un workflow que hoy es claro.

2. **Costes muy distintos = invocaciones distintas**:
   - `decide` (shallow): low effort, 3 perspectivas, HTML rápido.
   - `decision-stress-test`: high effort, 5-12 perspectivas + cross-debate (max 3 ciclos), validation gates. Diseñado para pre-commitment de decisiones costosas.
   - El riesgo que la US quería mitigar ("invocar el caro por error") no existe en la práctica: los triggers son distintos.

3. **Triggers ya están diferenciados sin ambigüedad**:
   - `decide`: "decide entre X e Y", "elegir", "trade-off".
   - `decision-stress-test`: "stress-test", "challenge", "pre-mortem", "before committing", "antes de decidir".
   - Cualquier "ayúdame a decidir" activa `decide`. Cualquier "challenge this" activa stress-test. No hay solape funcional real.

4. **Uso activo separado** (verificado en código):
   - `.claude/skills/orchestrator-protocol/references/04-agent-selection.md:59` — sugiere `decision-stress-test` como skill para planner cuando hay design risk.
   - `.claude/agents/planner.md:198` — referencia `decision-stress-test` para architectural decisions (Mode B).
   - Cortarla rompe este enrutamiento sin ganancia.

5. **Coste del merge > beneficio**:
   - ~1500 líneas a reorganizar.
   - Reducción: 1 skill del system prompt (~3-5K tokens). Coste de oportunidad alto vs ahorro real bajo.
   - Commandment III: "if a solution requires more than the problem asks for, it's the wrong solution".

### Acción tomada

- `decide` y `decision-stress-test` se mantienen como skills separadas.
- Frontmatter de ambas ya tiene triggers diferenciados — no se modifican (ya están bien).
- Decisión registrada en este archivo + memoria global (US-023).

### Commit

`docs(audit): reject US-013 — decide and decision-stress-test stay separate`

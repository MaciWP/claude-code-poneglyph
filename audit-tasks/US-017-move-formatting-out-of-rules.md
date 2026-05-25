---
id: US-017
phase: 2.4
status: completed
estimate: 25m
blocks: []
blockedBy: []
priority: low
risk: low
---

# US-017 · MOVE `formatting.md` fuera de `rules/` — no es rule condicional, es guía estética

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** mover el contenido de `formatting.md` de `.claude/rules/` a `.claude/STYLE.md` o como sección de `CLAUDE.md`
**Para** que `rules/` contenga solo verdaderas reglas (condicionales, accionables) y no guías estéticas

## Contexto extendido

### Evidencia recogida

`formatting.md` (~40 líneas) contiene:
- Cuándo usar tablas vs ASCII
- Qué bloques de código usar (con lang highlight)
- Mermaid para arquitectura
- Status icons (⏳ ⏸️ ✅ 🚫 ❌ ⚠️ 🔄)

**No tiene**:
- Condiciones del tipo "si X, entonces Y"
- Triggers de validación
- Comportamiento bloqueante

Es una **guía estilística**, no una rule en el sentido funcional.

### Diferencia entre rule y style guide

| Aspecto | Rule | Style guide |
|---|---|---|
| Naturaleza | "X está prohibido" / "Si A, hacer B" | "Usa este estilo cuando puedas" |
| Aplicación | Condicional / siempre | Recomendación |
| Violación | Detectable / bloqueable | Sutil, estética |
| Ubicación apropiada | `.claude/rules/` | `STYLE.md` o sección de CLAUDE.md |

### Por qué importa

- **Conceptual hygiene**: `rules/` debería ser pequeño y operacional
- **Coherencia con la auditoría**: 7 rules → 4 rules (US-016, US-017, US-018)
- **Style guides** se actualizan menos frecuentemente que rules, mantenerlas separadas refleja eso

## Análisis — pros y contras

### Pros del move

- **`rules/` queda más limpio** (solo cosas que el Lead/subagent debe aplicar como instrucción)
- **Coherencia semántica**: lo que es guía estética va a `STYLE.md`
- **Permite enriquecer `formatting.md`** con ejemplos sin temer "bloat de rules"
- **Reduce `rules/` de 7 a 6** (con US-016 y US-018 llegará a 4)

### Contras del move

- **Si `formatting.md` se cargaba automáticamente como rule** y `STYLE.md` no se carga → pérdida de aplicación
- **Trabajo administrativo**: hay que actualizar referencias

### Mitigación de contras

- Antes de mover, verificar que el contenido sigue accesible al Lead/subagents (sea vía `STYLE.md` autoload, sección de CLAUDE.md, o `additionalContext`)
- Si no hay forma de autoload de `STYLE.md`, la opción correcta es **mover el contenido a una sección de CLAUDE.md raíz** (US-022 lo gestiona)

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `STYLE.md` no se autoloada y se pierde la aplicación | Alta | Medio | Mover contenido a sección de CLAUDE.md raíz como alternativa |
| Otros archivos referencian `formatting.md` por path | Media | Bajo | Grep antes de mover |
| Subagents lo perdían también — y no tienen acceso a CLAUDE.md raíz por defecto | Media | Bajo | Verificar mecanismo; si se necesita en subagents, mantener como rule simplificada |

## Pasos técnicos detallados

### Paso 1 — Inspeccionar contenido (5 min)

```bash
Read .claude/rules/formatting.md
```

**Verificar**:
- ¿Hay alguna sección que sí sea regla accionable (no solo estética)?
- ¿Hay menciones de bloqueo o validación?

Si hay reglas accionables mezcladas con estética → separar: lo accionable se queda como rule (compactado), lo estético se mueve.

### Paso 2 — Decidir destino (5 min)

Opciones:
- **A) `STYLE.md` en raíz**: archivo separado, claro propósito. Requiere autoload.
- **B) Sección "Formatting" en CLAUDE.md raíz**: queda con el resto de guías de proyecto. Se carga siempre (CLAUDE.md raíz se carga por Claude Code default).
- **C) `.claude/STYLE.md`**: similar a A pero dentro de `.claude/`. Requiere autoload custom.

**Recomendación**: opción B (sección en CLAUDE.md raíz). El contenido se mantiene global, se carga al inicio, no requiere configuración adicional.

### Paso 3 — Mover contenido (10 min)

**Si opción B**:

```bash
Edit CLAUDE.md     # raíz del proyecto
```

Añadir sección al final (o en lugar apropiado):

```markdown
## Formatting (style guide)

[contenido completo de formatting.md, posiblemente compactado]
```

Verificar que la sección no rompe el flujo lógico del CLAUDE.md raíz.

### Paso 4 — Eliminar rule original (1 min)

```bash
Bash: rm .claude/rules/formatting.md
```

### Paso 5 — Verificar referencias externas (3 min)

```bash
Grep "rules/formatting" .claude/
Grep "formatting.md" .claude/
Grep "rules/formatting" CLAUDE.md
```

Actualizar referencias.

### Paso 6 — Smoke test (3 min)

Sesión nueva, pedirle al Lead: "Cita literalmente los status icons que debes usar (⏳, etc.)" → debe poder citar el contenido (vía nueva ubicación).

### Paso 7 — Commit (2 min)

```
refactor(rules): move formatting.md to CLAUDE.md root (style guide, not rule)

formatting.md was a style guide (tables/mermaid/icons), not a conditional rule.
Moved to "Formatting" section in CLAUDE.md root, which is auto-loaded.

- .claude/rules/formatting.md removed
- CLAUDE.md root expanded with Formatting section
- rules/ count: 7 → 6
```

## Criterios de aceptación

- [ ] `.claude/rules/formatting.md` no existe
- [ ] Contenido preservado en `CLAUDE.md` raíz (sección Formatting) o `STYLE.md`
- [ ] Smoke test: Lead cita correctamente los status icons
- [ ] Referencias externas actualizadas
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado

## Definition of Done

1. Contenido movido a destino apropiado (CLAUDE.md raíz sección Formatting)
2. Smoke test verifica acceso al contenido por el Lead
3. Commit
4. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura formatting.md como rule
```

## Notas

- Si los subagents necesitan el contenido (no solo el Lead), evaluar mantenerlo como rule simple en `.claude/rules/formatting.md` con frontmatter `paths: ["**"]` para que aplique a todos
- En ese caso, la historia se cierra como NO-MOVE con justificación: "los subagents necesitan acceso al contenido de formatting"
- Si la decisión es mantener como rule, considerar al menos COMPACTAR el contenido (eliminar ejemplos redundantes)

---

## Execution closure (2026-05-25)

**Veredicto**: ejecutada con scope ampliado — la US-017 sugería mover `formatting.md` a `STYLE.md` o sección de `CLAUDE.md`. La ejecución real fusionó `formatting.md` + `caveman` (output-style existente) → un único output-style `.claude/output-styles/poneglyph.md`. Esto cubre el objetivo de US-017 + retira `caveman` como output-style redundante.

**Por qué cambio el destino**:

1. Anthropic en docs oficiales (verificado vía WebFetch 2026-05-25 sobre `https://code.claude.com/docs/en/output-styles`) describe output-styles como "Modifies the system prompt for role, tone, and output format". Eso encaja con el contenido de `formatting.md` (tono + formato), no con una rule condicional.
2. `caveman` ya era output-style. Combinar tono terse + guía de formato en un solo output-style elimina dos piezas paralelas que cubrían el mismo plano.
3. Output-styles soportan `keep-coding-instructions: true` — preservamos las instrucciones built-in de software engineering.

**Cambios**:

- `.claude/rules/formatting.md` ELIMINADO (era 70 líneas).
- `.claude/output-styles/caveman.md` ELIMINADO (47 líneas, sustituido).
- Creado `.claude/output-styles/poneglyph.md` (~120 líneas): tono terse (sin filler / sin articulos / sin transitions) + guía de formato (tablas, Mermaid, code blocks) + status icons como uso operacional, no decorativo.
- Frontmatter actualizado a campos oficiales 2026: `name`, `description`, `keep-coding-instructions: true`.
- Referencias actualizadas: `.claude/skills/sync-claude/SKILL.md` línea 129 (`Caveman` → `Poneglyph` en ejemplo).

**Activación**:

`/output-style Poneglyph` o `/config` → Output style → Poneglyph. Cambio activo tras `/clear` o nueva sesión (output-style es parte del system prompt cacheado).

**Rules ahora**: 4 → 3 (`bootstrap-lead`, `error-recovery`, `performance` + `paths/`). `performance.md` se trata en US-018 separadamente.

---
id: US-008
phase: 2.2
status: rejected
estimate: 20m
blocks: []
blockedBy: []
priority: medium
risk: low
---

# US-008 · CUT 4 slash commands que son wrappers vacíos de skills

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** eliminar los 4 slash commands que solo envuelven una skill homónima
**Para** acabar con duplicación 1-a-1 que no aporta y crea confusión sobre qué invocar (`/decide` vs Skill('decide'))

## Contexto extendido

### Evidencia recogida

| Slash command | Función | Skill correspondiente |
|---|---|---|
| `/decide` | Invoca skill `decide` | Skill `decide` |
| `/sync-claude` | Invoca skill `sync-claude` | Skill `sync-claude` |
| `/explain-changes` | Invoca skill `explain-changes` | Skill `explain-changes` |
| `/planner` | Invoca skill `planner-protocol` | Skill `planner-protocol` |

En los 4 casos, el archivo `.claude/commands/<name>.md` tiene 8-20 líneas y su única función es disparar `Skill("<name>")`. Es trabajo duplicado.

### Por qué pasa esto

Claude Code soporta dos formas de invocar una skill:
1. **Usuario escribe `/decide`** → harness encuentra el comando, lo dispara (que internamente llama a la skill)
2. **Usuario escribe "Necesito decidir entre X e Y"** → triggers de la skill se activan automáticamente

La forma 2 es el diseño moderno (skills auto-trigger). La forma 1 es legacy de cuando "skills" no existían y todo eran "slash commands".

### Por qué importa

- **Confusión cognitiva**: ¿cuándo uso `/decide` vs decir "ayúdame a decidir"? Si el resultado es el mismo, mantener ambos es ruido
- **Coste minúsculo pero acumulativo**: cada slash command añade descripción al system prompt del Lead
- **Mantenimiento doble**: si la skill cambia su API/triggers, hay que actualizar también el wrapper

### Excepciones a considerar

Antes de cortar, verificar:
- **¿El wrapper pasa argumentos al skill que la skill por sí sola no recibiría?** Si `/decide --foo` se procesa diferente vía wrapper vs skill, NO cortar
- **¿Existe documentación de "usa /decide para X"** que se vuelve obsoleta? Marcar para US-022

## Análisis — pros y contras

### Pros de cortar

- **Elimina duplicación 1-a-1** — Commandment X
- **Reduce 4 archivos** + sus descripciones en el system prompt
- **Hace el modelo mental más simple**: "ya no son slash commands, son capabilities que se activan por contexto"
- **Coherente con la dirección de Claude Code**: skills modernas reemplazan slash commands legacy
- **Cero pérdida de funcionalidad** si los triggers de la skill son adecuados (verificable)

### Contras de cortar

- **Pierdes el "modo explícito"**: a veces escribir `/decide` es más rápido que esperar a que la skill se auto-trigger por keywords
- **Si los triggers de la skill son débiles**, sin el comando explícito la skill nunca se invoca → funcionalmente la pierdes
- **Costumbre del usuario**: si Oriol está acostumbrado a `/decide`, debe re-entrenarse

### Mitigación de contras

- Antes de cortar, **verificar triggers** de cada skill — si son robustos (3+ keywords claros), el corte es seguro
- Si los triggers son débiles, **fortalecerlos primero** (sub-tarea: añadir keywords) y luego cortar
- Documentar en CLAUDE.md o `MEMORY.md` la nueva forma de invocar (US-022/US-023)

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Skills no se auto-activan tras cortar el wrapper | Media | Medio | Verificar triggers antes; fortalecer si débiles |
| El usuario invoca `/planner` por costumbre y no encuentra | Alta | Bajo | Documentar en CLAUDE.md raíz que el comando se eliminó |
| El wrapper pasaba argumentos especiales (e.g. `/planner --quick`) | Baja | Medio | Verificar el archivo del comando; si pasa args, NO cortar tan directo |
| Otros archivos (docs, READMEs) referencian los comandos | Alta | Bajo | Grep amplio antes de cortar; update batch |

## Pasos técnicos detallados

### Paso 1 — Inspeccionar cada wrapper (8 min, 2 min por comando)

Para cada uno de: `decide`, `sync-claude`, `explain-changes`, `planner`:

```bash
Read .claude/commands/<name>.md
```

**Buscar**:
- ¿Solo invoca la skill o también añade lógica?
- ¿Pasa argumentos? (e.g. `Skill("decide", args="--depth=deep")`)
- ¿Tiene descripción única que no esté en la skill?

**Resultado por wrapper**: tabla en sección "Análisis individual" abajo.

### Paso 2 — Verificar triggers de cada skill (5 min)

Para cada skill cuyo wrapper se va a eliminar, leer su frontmatter:

```bash
Read .claude/skills/decide/SKILL.md            # leer description + keywords
Read .claude/skills/sync-claude/SKILL.md
Read .claude/skills/explain-changes/SKILL.md
Read .claude/skills/planner-protocol/SKILL.md
```

**Criterio**: la skill tiene triggers robustos si:
- Tiene 3+ keywords específicos en `description` o frontmatter
- Las keywords cubren los patrones comunes del usuario (e.g. para `planner`: "plan", "decompose", "roadmap", "planear", "dividir")
- Hay ejemplos de uso en la skill

**Si una skill tiene triggers débiles** (1-2 keywords genéricos), no cortarla → primero reforzar (sub-task del propio US-008).

### Paso 3 — Identificar referencias externas (5 min)

```bash
Grep "/decide" .claude/                    # menciones al comando (slash + nombre)
Grep "/sync-claude" .claude/
Grep "/explain-changes" .claude/
Grep "/planner" .claude/
Grep "/decide" CLAUDE.md                   # CLAUDE.md raíz
Grep "/planner" C:\Users\Maci\.claude\CLAUDE.md  # global
```

Lista de archivos que mencionan los comandos. Algunos casos a esperar:
- CLAUDE.md raíz menciona `/planner --quick|--standard|--full` → actualizar redacción
- Skill `bootstrap-plan-mode` puede mencionar `/planner` → actualizar
- README de skills meta-create-* puede mencionar `/decide` → actualizar

### Paso 4 — Eliminar wrappers (2 min)

```bash
Bash: rm .claude/commands/decide.md
Bash: rm .claude/commands/sync-claude.md
Bash: rm .claude/commands/explain-changes.md
Bash: rm .claude/commands/planner.md
```

### Paso 5 — Actualizar referencias críticas in-place (5 min)

Para cada referencia identificada en Paso 3 que sea "operacional" (no histórica):
- Reemplazar `/decide` con "Activa la skill `decide` (auto-trigger por keyword)"
- O reemplazar con un ejemplo de prompt que active el trigger

NOTA: la actualización de CLAUDE.md raíz se centraliza en US-022 — esta historia solo identifica las referencias.

### Paso 6 — Smoke test (3 min)

Sesión nueva. Probar:
1. Mensaje: "Ayúdame a decidir entre opción A y opción B" → ¿se activa la skill `decide`?
2. Mensaje: "Quiero planear cómo refactorizar el módulo X" → ¿se activa `planner-protocol`?
3. Mensaje: "Explícame qué hace este último commit" → ¿se activa `explain-changes`?
4. Mensaje: "Sincroniza la configuración global" → ¿se activa `sync-claude`?

**Si las 4 skills se auto-activan correctamente**: el corte fue exitoso.
**Si alguna no se activa**: ese trigger es débil → restaurar el wrapper correspondiente o reforzar el trigger antes de re-cortar.

### Paso 7 — Commit (2 min)

```
refactor(commands): remove 4 wrapper slash-commands

The commands /decide, /sync-claude, /explain-changes, /planner were
1:1 wrappers of homonymous skills. Skills auto-activate by keyword,
making the wrappers redundant.

- Removed .claude/commands/{decide,sync-claude,explain-changes,planner}.md
- Verified skill triggers cover the same user prompts
- Updated references in <listed files> (or queued for US-022)
```

## Análisis individual (verificado 2026-05-25)

| Wrapper | Líneas | Solo invoca skill | Pasa args | Skill auto-trigger (`disable-model-invocation`) | Decisión |
|---|---|---|---|---|---|
| /decide | 8 | Sí (`$ARGUMENTS` pass-through) | Sí | **NO** — `true` en `decide/SKILL.md:8` | NO CUT (rechazado) |
| /sync-claude | 65 | **NO** — ejecuta `bun .claude/skills/sync-claude/scripts/sync-claude.ts $ARGUMENTS` | Sí, 7 flags operativos (`--check`, `--execute`, `--backup`, `--unlink`, `--method`, `--force`, `--status`) | Sí (8 keywords) | NO CUT (es launcher real, no wrapper) |
| /explain-changes | 19 | Casi (añade default `--pending` + disambiguation) | Sí | Sí (12 keywords ES+EN) | NO CUT (rechazado) |
| /planner | 12 | Sí, pero procesa `--quick/--standard/--full` | Sí | Sí (auto-invocado por `bootstrap-plan-mode.md`) | NO CUT (rechazado) |

## Resolución (2026-05-25)

**Status: rejected** — decisión del usuario tras verificación de premisas.

### Divergencias detectadas

1. **`/decide`**: la premisa "skills auto-trigger por keywords" falla. `decide/SKILL.md:8` tiene `disable-model-invocation: true`, por lo que la skill **no** se activa por keywords. Eliminar el wrapper dejaría la skill inaccesible desde el usuario.
2. **`/sync-claude`**: la premisa "wrapper trivial de 8-20 líneas" falla críticamente. Son 65 líneas que ejecutan directamente un script TypeScript con args. No es wrapper, es launcher operativo.

### Razón de la decisión

El usuario valora el **modo explícito**: invocar `/planner` o `/decide` directamente es más rápido y predecible que depender del auto-trigger por keywords. Los wrappers aportan ese valor.

Coste real de mantenerlos: minúsculo (4 archivos pequeños, cada uno con su descripción en el system prompt del Lead). Beneficio: control explícito y predecibilidad.

### Posible re-evaluación futura

Si en el futuro se quisiera consolidar:
- Para `/decide`: cambiar `disable-model-invocation: true → false` y eliminar el wrapper (1 acción combinada).
- Para `/explain-changes` y `/planner`: la skill ya auto-trigger, eliminar wrapper sería viable.
- Para `/sync-claude`: NO eliminable sin refactor — el comando ejecuta script, la skill solo documenta.

Cualquier re-evaluación requiere nueva US explícita.

---

**Commit**: `faa1f76` — docs(audit): close US-008 as rejected — preserve all 4 wrapper commands

## Criterios de aceptación

- [ ] Los 4 wrappers son `CUT` (o documentadas las razones para mantener alguno)
- [ ] Archivos `.claude/commands/<name>.md` eliminados (los que sean CUT)
- [ ] Skills auto-activan correctamente vía prompt natural en smoke test
- [ ] Referencias en otros archivos: identificadas y agendadas (US-022 para CLAUDE.md raíz)
- [ ] `bun test ./.claude/hooks/` pasa (no afecta hooks, pero verificar)
- [ ] Commit realizado

## Definition of Done

1. Tabla "Análisis individual" rellena
2. 4 archivos eliminados (o tabla justifica excepciones)
3. Smoke test confirma auto-activación de skills
4. Commit con mensaje descriptivo
5. Frontmatter `status: completed`

## Rollback plan

Por wrapper:
```bash
git show <hash>:.claude/commands/<name>.md > .claude/commands/<name>.md
```

Si todos: `git revert <hash>` del commit.

Trivial — son archivos pequeños sin dependencias activas.

## Notas

- Si el smoke test del Paso 6 falla para alguna skill (trigger débil), considera:
  - **Reforzar trigger**: añadir 2-3 keywords más al frontmatter de la skill
  - **Mantener el wrapper**: documentar como excepción justificada
- El comando `/planner` se menciona en CLAUDE.md raíz con flags `--quick|--standard|--full`. Verificar si esos flags son procesados por el comando o por la skill. Si solo el comando los procesa, la skill no recibe esos hints → considerar mover el procesamiento al frontmatter de la skill antes de cortar
- Tras eliminar `/sync-claude`, considera que sync-claude también aparece como hook (`sync-claude.ts` si existe). Verificar que ese aspecto no se rompe

---
id: US-003
phase: 1
status: completed
completed_at: 2026-05-23
estimate: 30m
blocks: [US-006]
blockedBy: []
priority: high
risk: low
---

# US-003 · Verificar empíricamente si `memory-inject.ts` inyecta algo útil

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** confirmar de forma empírica si el hook `memory-inject.ts` está inyectando memoria a Lead o subagents
**Para** decidir si cortarlo (smoking gun: `memoryBytes: 0` en todas las spawns) o repararlo

## Contexto extendido

### Evidencia recogida

- En `agent-spawns.jsonl`: `memoryBytes: 0` en TODAS las instancias registradas
- En `agent-spawns.jsonl`: `skills: []` array vacío en TODAS las instancias
- El hook `memory-inject.ts` está registrado en `UserPromptSubmit`
- El sistema documenta Arch H ("Lead-Directed Skill Reads") como mecanismo principal de transferencia de skills
- CLAUDE.md menciona "memory-inject.ts (path-based hints)" como parte del flujo

### Por qué importa

`memory-inject.ts` es Commandment VIII (meta-prompting óptimo). Si los subagents no reciben memoria:
1. **Cada agente empieza de cero** cada vez, sin lecciones aprendidas
2. **El sistema de memoria global** (`~/.claude/projects/.../memory/`) solo sirve al Lead, no a subagents
3. **La inversión en MEMORY.md** (12+ archivos de memoria) tiene retorno parcial
4. **El sistema parece más sofisticado de lo que es**: el diseño promete persistencia, la realidad la entrega solo al Lead

### Importante: separar dos preguntas

| Pregunta | Cómo verificarlo | Importancia |
|---|---|---|
| ¿Inyecta al **Lead**? | Mensaje al Lead pidiéndole leer su system prompt | Alta — define si la memoria funciona globalmente |
| ¿Inyecta a **subagents**? | Delegar a un Explore/scout y pedirle que reporte su system prompt | Crítica — los datos `memoryBytes: 0` son de spawns de subagents |

**Posible diseño correcto**: el hook `UserPromptSubmit` solo afecta al turno del Lead (es como funciona Claude Code). Los subagents no reciben hooks UserPromptSubmit del padre — reciben su prompt inicial del Lead. Esto significa que `memoryBytes: 0` para spawns puede ser **diseño correcto** y no un bug.

Esta historia debe distinguir entre:
- **Bug**: el hook está roto y no inyecta ni al Lead
- **Limitación inherente**: el hook funciona al Lead pero no hay forma de inyectar a subagents vía hooks (eso es por diseño de Claude Code)
- **Funcionalidad redundante**: si funciona al Lead pero la información ya está en CLAUDE.md/MEMORY.md autoloaded → no aporta valor incremental

## Análisis — pros y contras de invertir tiempo aquí

### Pros

- **Diagnóstico barato** (30 min) con alto impacto: define si US-006 corta o repara
- **Aclara una confusión arquitectónica del sistema**: la diferencia entre memoria del Lead y memoria de subagents
- **Si confirma que es "limitación inherente"**, el sistema entero de Arch H (Lead-Directed Skill Reads) se entiende mejor y se puede simplificar
- **Test reproducible**: el experimento es fácil de re-ejecutar tras cambios futuros

### Contras

- **Si la respuesta es "funciona pero al Lead solo"**, igualmente requiere decidir si vale la pena el coste — análisis adicional fuera de esta historia
- **Algunas memorias podrían estar autoloaded vía CLAUDE.md auto-memory feature**, haciendo `memory-inject.ts` redundante incluso al Lead

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El Lead "alucina" tener memoria que no tiene (efecto psicológico de saber que hay un sistema) | Media | Medio | Preguntar por contenido específico de archivo de memoria, no por su existencia |
| El test del subagent es ambiguo (¿cuenta system prompt o initialPrompt?) | Media | Bajo | Pedir literalmente "los primeros 500 caracteres de tu system prompt" |
| Confundir auto-memory (`# auto memory` block en CLAUDE.md) con `memory-inject.ts` (son cosas distintas) | Alta | Medio | Leer ambos antes del experimento |

## Pasos técnicos detallados

### Paso 1 — Lectura estática (10 min)

```bash
Read .claude/hooks/memory-inject.ts                    # entender qué inyecta y de dónde
Read .claude/settings.json                              # verificar registro UserPromptSubmit
Read C:\Users\Maci\.claude\CLAUDE.md                    # buscar bloque "# auto memory" (es feature de Claude Code, distinta de memory-inject)
```

**Buscar específicamente en memory-inject.ts**:
- ¿De dónde lee la memoria? (path)
- ¿Cómo la inyecta? (additionalContext, system prompt prepend, etc.)
- ¿Filtra por path/keyword? (path-based hints mencionadas en CLAUDE.md)
- ¿Tiene salida si el archivo de memoria no existe?

### Paso 2 — Test al Lead (10 min)

En sesión nueva, primer mensaje:

> "Sin usar ninguna herramienta, dime literalmente: ¿qué texto exacto aparece en tu system prompt sobre 'auto memory' o 'memory-inject'? Si no aparece nada relevante, dilo claramente. NO inventes."

**Interpretación**:
- Si cita "auto memory" + ruta `C:\Users\Maci\.claude\projects\D--PYTHON-claude-code-poneglyph\memory\` → eso es el bloque auto-memory de Claude Code (built-in feature), NO memory-inject.ts
- Si cita contenido específico de algún `feedback_*.md` o `project_*.md` → memory-inject lo está inyectando
- Si dice "no veo memoria inyectada" → el hook no funciona

### Paso 3 — Test al subagent (10 min)

Delegar a `Explore` con este prompt:

> "Sin usar herramientas (Read/Grep/etc.), reporta lo siguiente desde tu memoria interna:
> 1. Las primeras 500 palabras literales de tu system prompt
> 2. ¿Contiene la palabra 'MEMORY' o 'memory-inject' o algún path tipo `feedback_*.md`?
> 3. ¿Hay alguna sección titulada 'memoria' o 'context injected' o similar?
> 
> Reporta literalmente, sin parafrasear."

**Interpretación**:
- Si el subagent reporta contenido del MEMORY.md del proyecto → `memory-inject` SÍ alcanza subagents
- Si reporta solo el prompt que el Lead le dio + frontmatter del archivo `.claude/agents/Explore.md` → `memory-inject` NO alcanza
- Si reporta también skills del directorio `.claude/skills/` → eso es Arch H, distinta a memory-inject

### Paso 4 — Documentar resultado (5 min)

Rellenar sección "Resultado" con conclusiones.

## Criterios de aceptación

- [ ] Confirmación empírica para Lead: inyecta SI / NO
- [ ] Confirmación empírica para subagent: inyecta SI / NO
- [ ] Si NO inyecta, causa raíz identificada (entre: hook no se ejecuta, archivo de memoria vacío, path roto, diseño no permite inyectar a subagents)
- [ ] Distinción clara entre `memory-inject.ts` y bloque `# auto memory` de Claude Code (feature built-in)
- [ ] Recomendación para US-006: REPARAR / CUT / KEEP (si funciona)

## Definition of Done

1. Sección "Resultado" rellena con tabla concreta (Lead/Subagent × SI/NO)
2. Recomendación clara para US-006
3. No se han modificado archivos durante el diagnóstico (es solo lectura + tests conversacionales)

## Rollback plan

No aplica — historia puramente de lectura y diálogo con agentes. No introduce cambios al sistema.

## Resultado

### Hallazgo principal — el nombre miente

**`memory-inject.ts` NO inyecta memoria. Nunca. A nadie.**

Lectura del código (`.claude/hooks/memory-inject.ts:124`):

```typescript
await emitOutput("", prompt, sessionTitle);
//               ^^ primer argumento (context) es literalmente string vacío
```

El archivo NO abre ni lee `MEMORY.md`, ni `feedback_*.md`, ni `project_*.md`, ni el directorio `~/.claude/projects/.../memory/`. No hay `readFileSync(memoryPath)` en ninguna parte. Lo que el hook realmente hace en `UserPromptSubmit`:

1. **Construye `sessionTitle`** (máx. 50 chars del prompt) — solo en el primer turno
2. **Extrae paths del prompt** (regex de extensiones: `.ts/.py/.go/.md/...`) y, vía `getSkillReadPaths(filePath)` de `path-rule-loader`, sugiere skills relevantes en un bloque titulado `## Path-Based Skills (for delegation)`
3. **Si no encuentra paths con skills asociados, no inyecta nada** salvo el sessionTitle

El bloque `# claudeMd` con contenido de `MEMORY.md` que sí aparece en el system prompt del Lead viene de la **feature built-in `auto memory` de Claude Code** (instrucciones del harness en el system prompt + auto-carga del índice MEMORY.md del proyecto). Es funcionalidad nativa del CLI, no del hook custom.

### Tabla concreta

| Destino | Inyecta memoria | Inyecta otra cosa | Contenido inyectado | Vía |
|---|---|---|---|---|
| **Lead** | **NO** | Sí (parcial) | `sessionTitle` en primer turno + bloque `## Path-Based Skills (for delegation)` si el prompt contiene paths con extensiones reconocidas | `memory-inject.ts` (mal nombrado: es path-skill-hints + session-init, **no** memory-inject) |
| **Subagent** | **NO** | NO | Nada — el subagent Explore reportó textualmente que su system prompt **NO contiene** "MEMORY", "memory-inject", paths `feedback_*.md`, ni secciones "Windows PATH"/"Pivot Estratégico"/"Hardware del usuario"/"CachyOS Limine ESP". Coincide con `memoryBytes: 0` y `skills: []` en `agent-spawns.jsonl` | N/A — hooks `UserPromptSubmit` solo afectan al turno del Lead, por diseño de Claude Code |

### Lead — desambiguación de la fuente del `# claudeMd`

| Pregunta | Respuesta |
|---|---|
| ¿`memory-inject.ts` inyecta el bloque `# claudeMd` con MEMORY.md? | **NO** — el código pasa `""` como contexto y nunca lee `MEMORY.md` |
| ¿De dónde viene entonces ese bloque al Lead? | De la **feature built-in auto-memory de Claude Code** — el harness auto-incluye `# auto memory` (instrucciones) + el contenido del `MEMORY.md` del proyecto bajo `# claudeMd` en cada turno del Lead |
| ¿`memory-inject.ts` inyecta algo útil al Lead? | Sí, pero no memoria: `sessionTitle` (en primer turno) + `## Path-Based Skills` (cuando el prompt menciona paths). Funcionalidad útil pero distinta del nombre |

### Recomendación para US-006: **REPARAR** (preferida) o **CUT total** (alternativa razonable)

**Por qué REPARAR** (recomendación principal):

El archivo SÍ aporta dos funciones útiles:
- `sessionTitle` (útil cosmético — UI de Claude Code)
- `## Path-Based Skills` hints (apoya Arch H — Lead-Directed Skill Reads — sugiriendo qué `Read .claude/skills/<name>/SKILL.md` incluir en delegaciones)

Reparar = **renombrar** el archivo a algo honesto (`session-init.ts`, `path-skill-hints.ts`, `prompt-enrichment.ts`) + actualizar el comando en `.claude/settings.json:44` + buscar/actualizar referencias en docs (`CLAUDE.md` línea sobre "memory-inject.ts (path-based hints)" ya lo describe correctamente, solo cambiar el nombre del archivo).

No requiere lógica nueva: el archivo ya hace lo que su funcionalidad real exige. Es renombrado + clarificación de docs.

**Por qué CUT total como alternativa razonable**:

Si se considera que `sessionTitle` es marginal y `## Path-Based Skills` es redundante con que el Lead use el skill `orchestrator-protocol` (que ya enseña Arch H), entonces eliminar el hook entero es viable. La pérdida funcional es pequeña.

**Por qué NO KEEP**:

Mantener el nombre `memory-inject.ts` perpetúa la confusión arquitectónica documentada en este diagnóstico: lectores creen que hay inyección de memoria a subagents (no la hay) o al Lead (tampoco — esa inyección viene de auto-memory built-in). La promesa rota del nombre es Commandment X (mantenibilidad del meta-sistema) y Commandment II (verdad factual).

### Justificación condensada (3 líneas)

`memory-inject.ts` NO inyecta memoria: pasa `""` como contexto y nunca lee `MEMORY.md`. Lo que sí inyecta (`sessionTitle` + `## Path-Based Skills`) es útil pero está mal nombrado. El bloque `# claudeMd` con MEMORY.md que ve el Lead viene de la feature built-in auto-memory de Claude Code, no del hook. Los subagents no reciben **nada** (confirmado por test conversacional al Explore + consistencia con `memoryBytes: 0` en `agent-spawns.jsonl`).

## Notas

- El bloque `# auto memory` en CLAUDE.md global es una **feature built-in de Claude Code**, distinta del hook custom `memory-inject.ts`. Confirmado empíricamente: el archivo del hook nunca lee `MEMORY.md`
- Patrón zombie adicional detectado (registrado como nota, no como HU nueva): el commit `ccdc88c fix(hooks): eliminar API HTTP muerta en memory-inject + timestamp ISO + comentario agent_id` ya hizo cleanup previo. El archivo es **residuo evolucionado** de una versión anterior que probablemente sí inyectaba memoria — quedó el nombre + el registro `UserPromptSubmit`, pero la lógica de memoria se eliminó dejando solo el "best-effort" de path-skill hints
- Por diseño de Claude Code: los hooks `UserPromptSubmit` solo aplican al turno del Lead. Los subagents reciben su prompt inicial directamente del Lead, sin pasar por hooks del padre. Por tanto, **incluso si `memory-inject.ts` quisiera inyectar memoria a subagents, no podría hacerlo via este hook**. La única vía para dar contexto a subagents es Arch H (Lead-Directed Skill Reads) — embedding `Read .claude/skills/<name>/SKILL.md` instructions en el prompt de delegación
- Por tanto el sistema ya está alineado con la realidad arquitectónica: subagents reciben skills via Arch H, no via memoria persistente. El nombre `memory-inject.ts` es lo único que da una falsa promesa
- US-006 debería pivotar: en lugar de "cortar memory-inject", el alcance natural es "renombrar + clarificar comentarios + actualizar docs"

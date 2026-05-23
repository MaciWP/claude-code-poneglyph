---
id: US-006
phase: 2.1
status: pending
estimate: 30m
blocks: []
blockedBy: [US-003]
priority: high
risk: low
updated_at: 2026-05-23
veredicto_pre_us003: REPAIR (rename)
---

# US-006 · REPAIR (rename) hook `memory-inject.ts` — US-003 reveló nombre engañoso

> **Cambio de alcance — 2026-05-23**: el título original era "CUT hook memory-inject.ts si US-003 confirma inactivo". US-003 reveló que la pregunta correcta no es "¿inyecta memoria?" (no lo hace) sino "¿el nombre refleja lo que hace?" (no lo refleja). El veredicto correcto es **REPAIR vía rename + actualización de docs**, no CUT total.

## Hallazgo de US-003 (2026-05-23) — re-encuadre de la historia

Diagnóstico empírico cerrado en commit `99ef23b`. Conclusiones que cambian el alcance de esta HU:

1. **`memory-inject.ts` nunca lee `MEMORY.md`** ni el directorio `~/.claude/projects/.../memory/`. El código (línea 124) pasa `""` como contexto inicial. La inyección de memoria no existe — nunca existió en la versión actual del archivo.

2. **El bloque `# claudeMd` con MEMORY.md que ve el Lead** viene de la **feature built-in `# auto memory` de Claude Code** (instrucciones del harness + auto-carga del `MEMORY.md` del proyecto). NO viene de este hook. CUT total del hook **no afecta** a la memoria del Lead — ya hoy funciona sin el hook participar.

3. **`memory-inject.ts` sí inyecta dos cosas útiles** (no memoria):
   - `sessionTitle` (máx. 50 chars del prompt, primer turno) — útil cosmético para UI de Claude Code
   - Bloque `## Path-Based Skills (for delegation)` — si el prompt contiene paths con extensiones reconocidas, sugiere `Read .claude/skills/<name>/SKILL.md` correspondientes. Apoya Arch H (Lead-Directed Skill Reads)

4. **Los subagents nunca recibieron memoria del hook** — por diseño de Claude Code: hooks `UserPromptSubmit` solo aplican al turno del Lead. Consistente con `memoryBytes: 0` y `skills: []` en `agent-spawns.jsonl`.

5. **Patrón zombie evolucionado**: commit `ccdc88c` ("eliminar API HTTP muerta en memory-inject + timestamp ISO + comentario agent_id") ya hizo limpieza previa. El archivo es residuo de una versión anterior — quedó el nombre + el registro `UserPromptSubmit`, pero la lógica de memoria se eliminó dejando solo funcionalidad lateral.

## Historia (actualizada)

**Como** mantenedor del sistema poneglyph
**Quiero** renombrar `memory-inject.ts` para que su nombre refleje lo que realmente hace (path-skill hints + session init) y actualizar docs que lo describen como inyector de memoria
**Para** eliminar la promesa rota arquitectónica (Commandment II — verdad factual) sin perder la funcionalidad útil que ya provee

## Veredicto (decidido por US-003): **REPAIR (rename)**

| Opción | Análisis | Decisión |
|---|---|---|
| **REPAIR (rename + clarificar)** | Mantiene `sessionTitle` y `## Path-Based Skills` (útil para Arch H). Coste bajo (10-15 min). Elimina la confusión arquitectónica del nombre `memory-inject` | **Recomendada** |
| **CUT total** | Pierde `sessionTitle` (marginal) y `## Path-Based Skills` (pequeña ayuda a Arch H). Más drástico. Defensible si se considera que `orchestrator-protocol` skill ya enseña Arch H y los hints son redundantes | **Alternativa aceptable** — escalar a usuario si el rename no convence |
| **KEEP sin cambios** | Perpetúa el nombre engañoso. Viola Commandment II (verdad) y Commandment X (mantenibilidad) | **Descartada** |

### Por qué importa

Si memory-inject está muerto:
1. Es **Commandment VIII (meta-prompting)** en rojo — el sistema promete memoria persistente que no entrega
2. Es un hook que se ejecuta en CADA `UserPromptSubmit` (¡cada turno!) → coste pequeño pero acumulativo
3. **Confusión arquitectónica**: hay dos mecanismos de "memoria" coexistiendo y solo uno funciona
4. **Tests asociados** posiblemente verifican el output del hook (no su efecto real)

## Análisis — pros y contras

### Pros de cortar (si US-003 confirma inactivo)

- **Limpieza arquitectónica**: queda solo `# auto memory` built-in, que funciona y está documentado
- **Reducción de coste por turno**: aunque pequeño, se acumula
- **Menos archivos a mantener**: 1 hook menos, 1 entrada menos en settings.json
- **Documentación más clara**: CLAUDE.md menciona "memory-inject (path-based hints)" — si no funciona, esa documentación miente
- **Coherente con el principio "no zombis"**

### Contras de cortar

- **Pierdes el mecanismo de "path-based hints"** documentado en CLAUDE.md como parte del Arch H workflow
- **Si la intención era inyectar a subagents y solo había un bug**, cortarlo en vez de repararlo pierde la oportunidad
- **Algunos memorias específicas** podrían no estar cubiertas por auto-memory (verificar)

### Mitigación de contras

- Reconstruir el hook con propósito claro es trivial si en 3 meses se identifica el caso de uso real
- Auto-memory built-in se documenta en CLAUDE.md global y cubre el caso del Lead — para subagents es por diseño imposible (vía hooks UserPromptSubmit)

### Caso especial: REPARAR en vez de CUT

Si US-003 muestra "casi funciona, solo falta X", evaluar reparación con time-box de 30 min máximo. Más allá: CUT.

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El hook era el único path para feedback memorias (`feedback_*.md`) específicas | Media | Medio | Verificar que cada feedback memoria está mencionada en MEMORY.md global (autoload) |
| Hay otros hooks que dependen del estado que memory-inject prepara | Baja | Bajo | `Grep "memory-inject" .claude/` antes de cortar |
| Auto-memory built-in tiene comportamiento distinto (filtros, slicing) y no es 1-a-1 | Alta | Bajo | Aceptar la diferencia; auto-memory es lo que documenta Claude Code |
| Tests del hook se rompen al eliminar el archivo | Alta | Bajo | Eliminar tests asociados al hook eliminado |

## Pasos técnicos detallados — REPAIR (rename)

Nombre propuesto para el archivo renombrado: **`prompt-enrichment.ts`** (refleja las dos funciones reales: sessionTitle y path-skill hints). Alternativas también válidas: `session-init.ts`, `path-skill-hints.ts`.

### Paso 1 — Inventariar referencias (5 min)

```bash
Grep "memory-inject" .claude/                                       # hooks, skills, agents
Grep "memory-inject" CLAUDE.md                                       # CLAUDE.md raíz
Grep "memory-inject" C:\Users\Maci\.claude\CLAUDE.md                # global
Grep "memory-inject" .claude/settings.json                           # registro UserPromptSubmit
Grep "memory-inject" audit-tasks/                                    # backlog (varios)
Grep "memoryBytes" .claude/                                          # campo emitido en logs
Grep "path-based hints" .claude/                                     # ya describe correctamente lo que hace
```

Documentar cada archivo y qué frase reemplazar. **Las que mencionan "path-based hints" como descripción de lo que hace ya son correctas** — solo cambiar el nombre del archivo. Las que sugieren que inyecta memoria son las que mienten.

### Paso 2 — Renombrar el archivo + tests (3 min)

```bash
Bash: git mv .claude/hooks/memory-inject.ts .claude/hooks/prompt-enrichment.ts
Bash: git mv .claude/hooks/__tests__/memory-inject.test.ts .claude/hooks/__tests__/prompt-enrichment.test.ts  # si existe
```

Actualizar dentro del test: cualquier `import "../memory-inject"` → `import "../prompt-enrichment"`. Los nombres de `describe/it` que digan "memory-inject" cambian a "prompt-enrichment".

### Paso 3 — Actualizar registro en settings.json (2 min)

Cambiar la línea 44 de `.claude/settings.json`:

```diff
- "command": "bun $HOME/.claude/hooks/memory-inject.ts"
+ "command": "bun $HOME/.claude/hooks/prompt-enrichment.ts"
```

**Verificación**:
```bash
Grep "memory-inject" .claude/settings.json   # debe devolver 0
```

### Paso 4 — Actualizar referencias en documentación (10 min)

| Archivo | Cambio |
|---|---|
| `CLAUDE.md` raíz | Línea sobre "memory-inject.ts (path-based hints)" → "prompt-enrichment.ts (path-based hints + session title)". US-022 absorbe este cambio si aún no se ejecutó |
| `~/.claude/CLAUDE.md` global | Misma sustitución de nombre si menciona el archivo (preserva el bloque `# auto memory` — esa es feature distinta) |
| `MEMORY.md` global | Sin cambios — no menciona `memory-inject` (verificado en US-003) |
| `.claude/skills/orchestrator-protocol/references/06-context-arch-h.md` | Verificar y actualizar si menciona el nombre |
| `audit-tasks/README.md` | Actualizar el slug `cut-memory-inject` o anotar el cambio de alcance |

### Paso 5 — Tests + smoke test (3 min)

```bash
Bash: bun test ./.claude/hooks/         # debe seguir pasando
```

**Smoke test** (sesión nueva, primer mensaje con un path):
- Verificar que el `sessionTitle` se construye igual
- Verificar que si el prompt incluye un path tipo `.claude/hooks/foo.ts`, el bloque `## Path-Based Skills (for delegation)` aparece en el system prompt del Lead

### Paso 6 — Commit (2 min)

```
refactor(hooks): rename memory-inject → prompt-enrichment (honest naming)

US-003 (commit 99ef23b) found that memory-inject.ts never read MEMORY.md.
What it actually does: build sessionTitle + inject `## Path-Based Skills`
hints based on file paths in the prompt. The name was a leftover from an
earlier version (see commit ccdc88c).

The Lead's MEMORY.md visibility comes from Claude Code's built-in
`# auto memory` feature, not from this hook. Subagents never received
anything (UserPromptSubmit hooks don't propagate to subagents by design).

This commit renames the file and updates references. No logic changes.
```

## Pasos técnicos alternativos — CUT total

Solo si el usuario prefiere eliminar la funcionalidad (sessionTitle + path-skill hints) en lugar de mantenerla bajo nombre honesto:

C1. `git rm .claude/hooks/memory-inject.ts` + test asociado
C2. Eliminar entrada `UserPromptSubmit` de `.claude/settings.json`
C3. Eliminar referencias en docs (CLAUDE.md, skill `orchestrator-protocol`)
C4. Smoke test: confirmar que el Lead sigue viendo MEMORY.md vía auto-memory built-in (NO debería romperse, ya no dependía del hook)
C5. Commit como `refactor(hooks): remove memory-inject — functionality marginal, name misleading`

Pérdida funcional aceptada: sessionTitle (cosmético) + ayuda automática a Arch H vía path-skill hints (sustituible documentando manualmente que el Lead lea skills relevantes).

## Criterios de aceptación

### Camino principal — REPAIR (rename)

- [ ] Archivo renombrado: `.claude/hooks/memory-inject.ts` → `.claude/hooks/prompt-enrichment.ts` (vía `git mv` para preservar historial)
- [ ] Test asociado renombrado (si existe) y sus `import` actualizados
- [ ] `.claude/settings.json:44` apunta al nuevo path
- [ ] `Grep "memory-inject" .claude/` devuelve 0 resultados (excepto en este propio archivo de auditoría como referencia histórica)
- [ ] Referencias en `CLAUDE.md` raíz, `~/.claude/CLAUDE.md` global y skills actualizadas
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Smoke test: en sesión nueva, prompt con path `.ts` debe seguir produciendo bloque `## Path-Based Skills` en el contexto inyectado del Lead
- [ ] Commit `refactor(hooks): rename memory-inject → prompt-enrichment (honest naming)`

### Camino alternativo — CUT total (solo si el usuario lo prefiere)

- [ ] Archivo eliminado + test asociado
- [ ] `settings.json` sin entrada UserPromptSubmit del hook
- [ ] Referencias en docs eliminadas
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Smoke test: Lead sigue viendo MEMORY.md vía `# auto memory` built-in (no regresión)
- [ ] Commit `refactor(hooks): remove memory-inject — functionality marginal, name misleading`

## Definition of Done

1. Rename ejecutado (camino principal) o CUT total ejecutado (camino alternativo)
2. `Grep "memory-inject" .claude/` devuelve 0 resultados en hooks/settings/skills
3. `bun test ./.claude/hooks/` pasa
4. Smoke test verifica no-regresión del comportamiento real (sessionTitle + path-skill hints si REPAIR; auto-memory built-in solo si CUT)
5. Commit con mensaje descriptivo y referencia a US-003 (`99ef23b`)
6. Frontmatter `status: completed` + `completed_at: YYYY-MM-DD`

## Rollback plan

```bash
git revert <hash>
```

REPAIR es un rename + actualización de strings — revertirlo es trivial y sin pérdida de datos. CUT pierde `sessionTitle` y path-skill hints; el revert los restaura.

## Decisión

> _Pre-determinada por US-003. Rellenar después de ejecutar la acción._

**Resultado US-003** (commit `99ef23b`): `memory-inject.ts` no inyecta memoria. Inyecta `sessionTitle` + `## Path-Based Skills` (útil pero mal nombrado). El MEMORY.md que ve el Lead viene de auto-memory built-in, no del hook. Los subagents no reciben nada del hook (por diseño de Claude Code).
**Veredicto US-006**: **REPAIR (rename)** — preferido. CUT total aceptable como fallback.
**Commit hash**: ___

## Notas

- Aunque `memory-inject` no inyecte a subagents, el sistema sigue teniendo Arch H ("Lead-Directed Skill Reads") como mecanismo de transferencia de skills. Memory-inject y Arch H son cosas distintas — la primera es path-skill hints automático al Lead, la segunda es el mecanismo manual por el que el Lead embebe `Read SKILL.md` en prompts de delegación
- Si REPAIR: actualizar `MEMORY.md` global para añadir entrada que aclare que la persistencia al Lead viene de `# auto memory` built-in, no del hook (evita re-confundirse en el futuro)
- Si CUT: añadir nota al `CLAUDE.md` con la misma aclaración
- El hook `prompt-enrichment.ts` (post-rename) sigue siendo un buen lugar para añadir lógica de pre-prompt al Lead si en el futuro se quiere — el rename no cierra ese camino, lo abre con un nombre honesto

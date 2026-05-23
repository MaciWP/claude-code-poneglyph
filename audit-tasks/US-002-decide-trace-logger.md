---
id: US-002
phase: 1
status: completed
estimate: 45m (reparar) | 20m (cortar)
actual: 5m (side-effect close)
blocks: [todo-fase-2]
blockedBy: [US-001]
priority: critical
risk: medium
completed_at: 2026-05-23
---

# US-002 · Decidir: reparar o cortar `trace-logger.ts`

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** tomar una decisión binaria sobre `trace-logger.ts` basada en el diagnóstico de US-001
**Para** no mantener un componente zombi (que es exactamente lo que esta auditoría está corrigiendo)

## Contexto extendido

Tras US-001 hay 2 caminos posibles. La filosofía del replanteo es **"no zombis"**: o el componente funciona y aporta valor, o se elimina. La opción "déjalo como está" generó el problema actual y no se permite aquí.

### Por qué la decisión es binaria

- **Reparar zombie = bloat con coste**: cada turno de cada sesión paga el coste de ejecutar el hook (aunque sea pequeño), sin recibir el beneficio
- **Mantener como decoración = mentirse**: el sistema sigue declarando "tengo observabilidad" cuando no la tiene
- **Cortar y re-implementar luego si hace falta = honesto**: si descubrimos en 3 meses que necesitamos métricas, las re-añadimos con propósito claro

### Análisis dependiente del diagnóstico US-001

| Diagnóstico US-001 | Recomendación | Razón |
|---|---|---|
| H1 (excepción silenciosa, fácil de capturar) | REPARAR | Fix de 1-2 líneas + try/catch decente |
| H2 (registro roto en settings.json) | REPARAR | Fix de 1 línea en JSON |
| H3 (escribe a otro sitio) | REPARAR | Cambio de ruta + comunicar |
| H4 (regresión Claude Code core) | CUT + reportar issue upstream | No es nuestro arreglo |
| H5 (permisos) | REPARAR | mkdir + chmod + commit |
| H6 (env var mal) | REPARAR | documentar var requerida |
| No diagnosticado en 45 min | CUT | Filosofía no-zombi gana |

## Análisis — pros y contras de cada decisión

### Opción REPARAR

#### Pros

- **Mantienes la capacidad de auto-diagnóstico** del sistema (cost, scoring, error patterns)
- **Información histórica acumulada**: los 21 archivos ya existentes pueden compararse con los nuevos
- **`/cost` y `/traces` y `/poneglyph-insights` siguen funcionando**
- **El esfuerzo de mantener métricas ya pagó upfront** — no perderlo si el fix es trivial

#### Contras

- **Si la causa raíz no es trivial**, puedes acabar dedicando >2h al hook en vez de a los cortes que dan valor real
- **Riesgo de re-romper**: cualquier cambio en `/sync-claude`, Windows, Claude Code update puede volver a romperlo si no se trata la causa estructural
- **Las métricas que registra están parcialmente obsoletas**: `parallelism-metrics` y `memoryBytes` son señales pobres (US-003, US-005 cuestionan sus emisores)
- **Tentación de "mientras lo arreglo, lo mejoro"** — scope creep

### Opción CUT

#### Pros

- **Decisión rápida** (20 min vs 45+ min)
- **Reduce superficie de mantenimiento** — un hook menos que se pueda romper en el futuro
- **Honestidad operacional**: si no se usa `/cost` /`/traces`, no tiene sentido escribirlos
- **Coherencia con el resto del plan**: estamos cortando componentes muertos, este es uno de ellos
- **Alternativa existe**: `console.anthropic.com` provee dashboard oficial de coste

#### Contras

- **Pierdes la capacidad de auto-diagnóstico local** del sistema
- **Skill `traces` y comando `/traces` quedan inútiles** — hay que cortarlos también (cascade)
- **Si en 3 meses necesitas métricas, hay que re-construir** (probablemente sí merece reconstruir bien)
- **Pérdida de información histórica accesible programáticamente** (los JSONL existentes quedan huérfanos)

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Reparar y volver a romper en 1 mes por mismo motivo | Media | Medio | Si se repara, añadir test que verifique escritura post-Stop; commitear el test |
| Cortar y luego necesitar el hook | Baja | Bajo | Está en git history, recuperable |
| Cortar trace-logger pero olvidar comando `/traces` y skill `traces` que dependen → quedan zombis | Alta si se descuida | Medio | Checklist explícito en pasos técnicos |
| Reparar pero la causa real era Claude Code (H4) → arreglo aparente pero falla intermitente | Media si H4 | Alto | Si US-001 apunta a H4, ir directo a CUT |

## Pasos técnicos — opción REPARAR

### Paso R1 — Aplicar el fix indicado en US-001 (10-30 min)

Dependiendo del diagnóstico:
- **H1** (excepción silenciosa): añadir `console.error(err)` en catch y/o normalizar la ruta con `path.join(os.homedir(), '.claude', 'traces')`
- **H2** (settings.json): corregir matcher/command
- **H3** (ruta incorrecta): corregir la ruta de destino
- **H5** (permisos): `Bash: mkdir -p ~/.claude/traces` (la falta del directorio es común tras una limpieza)
- **H6** (env var): documentar requerimiento o eliminar dependencia

### Paso R2 — Añadir test que prevenga recurrencia (15 min)

```typescript
// .claude/hooks/__tests__/trace-logger.test.ts
import { test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

test("trace-logger writes to expected directory", async () => {
  // Inyectar mock del Stop event y verificar que escribe
  // (estructura concreta depende del hook)
});

test("trace-logger does not throw on missing directory", async () => {
  // Verificar que mkdir -p en runtime es resiliente
});
```

### Paso R3 — Smoke test (5 min)

1. Sesión nueva con prompt trivial ("hola")
2. Esperar Stop
3. `Glob ~/.claude/traces/*.jsonl` — debe haber archivo con fecha de hoy
4. Verificar contenido: 1 línea JSON válida con tokens, costUsd, model

### Paso R4 — Commit

```
fix(hooks): repair trace-logger after 31-day silence

- Root cause: <H1-H6 según diagnóstico>
- Fix: <descripción concreta>
- Added test to prevent recurrence
```

## Pasos técnicos — opción CUT

### Paso C1 — Eliminar registro y archivo (5 min)

```bash
# 1. Editar settings.json: quitar la entrada del Stop hook trace-logger
Edit .claude/settings.json

# 2. Eliminar el archivo (NO el directorio __tests__ si comparten utilidades)
Bash: rm .claude/hooks/trace-logger.ts

# 3. Si hay tests específicos del hook
Bash: rm .claude/hooks/__tests__/trace-logger.test.ts  # si existe
```

### Paso C2 — Buscar y eliminar referencias huérfanas (10 min)

```bash
Grep "trace-logger" .claude/                  # referencias en código
Grep "traces" .claude/skills/                 # skill `traces` puede depender
Grep "poneglyph-insights" .claude/commands/   # command que lee traces
```

**Para cada referencia encontrada**:
- Si es skill `traces` o comando `/traces` o `/poneglyph-insights` → marcar para CUT en US-010 (poneglyph-insights) y nuevo US si necesario
- Si es memoria global → actualizar en US-023
- Si es CLAUDE.md → actualizar en US-022

### Paso C3 — Decisión sobre archivos JSONL existentes (5 min)

Los 21 archivos en `~/.claude/traces/`:
- **Opción A**: dejarlos (ocupan poco, son historia)
- **Opción B**: archivarlos a `~/.claude/traces/_archive/` (limpieza simbólica)
- **Opción C**: borrarlos (limpieza total)

**Recomendación**: A (dejar). Cero esfuerzo, cero riesgo, historial recuperable.

### Paso C4 — Commit

```
refactor(hooks): remove dead trace-logger hook

The hook has not written for 31 days due to <causa US-001>.
Decision: cut rather than maintain a zombie.

- Removed .claude/hooks/trace-logger.ts
- Removed Stop registration from settings.json
- Existing ~/.claude/traces/*.jsonl preserved as historical archive
- /cost, /traces, /poneglyph-insights cleanup tracked in US-010
```

## Criterios de aceptación

### Si REPARAR

- [ ] Smoke test pasa: existe JSONL nuevo con fecha de hoy en `~/.claude/traces/` tras 1 sesión nueva
- [ ] Test unitario añadido y pasando
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado con mensaje descriptivo
- [ ] La sección "Decisión" de este archivo refleja "REPARADO" con causa

### Si CUT

- [ ] `trace-logger.ts` eliminado del filesystem
- [ ] Entrada removida de `settings.json` (verificar con `Grep "trace-logger" .claude/settings.json` → 0 resultados)
- [ ] Referencias huérfanas identificadas y agendadas (US-010 si aplica)
- [ ] `bun test ./.claude/hooks/` pasa (sin el test del hook eliminado)
- [ ] Commit realizado
- [ ] Sesión nueva no falla por referencia al hook

## Definition of Done

1. Decisión binaria registrada y ejecutada
2. Tests del repo siguen pasando
3. `git status` limpio
4. Commit en `main` o branch dedicada
5. Frontmatter `status: completed`

## Rollback plan

### Si REPARAR fracasa

```bash
git revert <hash-del-commit>
# Avanzar a opción CUT
```

### Si CUT se ejecutó y luego se necesita el hook

```bash
git revert <hash-del-commit-de-cut>
# o
git show <hash>:.claude/hooks/trace-logger.ts > .claude/hooks/trace-logger.ts
# Y volver a registrar en settings.json
```

## Decisión

> Cerrada el 2026-05-23 como **CUT no-op por side-effect**. La decisión binaria que esta historia pedía ya estaba tomada y ejecutada antes de que el backlog se redactara.

| Campo | Valor |
|---|---|
| **Veredicto** | **CUT** — confirmado. |
| **Justificación** | El diagnóstico de US-001 demostró que `trace-logger.ts` fue eliminado deliberadamente por Oriol el **2026-04-29** en commit `a5bbb18` ("refactor(hooks): eliminar pipeline trace/scoring/patterns (Opción C)"). El motivo documentado en el commit message — datos corruptos por double-counting de tokens, ruido en contexto, pipeline sin API activa — coincide con la filosofía "no zombis" de esta historia. La decisión binaria que pedía US-002 ya estaba tomada hace 24 días. |
| **Commit hash (corte real)** | `a5bbb18` (2026-04-29) — eliminó `trace-logger.ts` (277 líneas), `trace-logger.test.ts` (363 líneas), 37 archivos del pipeline y 7 entradas de hooks en `settings.json`. |
| **Tests añadidos** | N/A — no aplica (rama CUT). |

### Trabajo residual ya ejecutado fuera de US-002

Cuando se redactó esta historia, la tabla "Paso C2 — Buscar y eliminar referencias huérfanas" listaba como pendientes la skill `traces` y el command `poneglyph-insights`. Ambas fueron eliminadas durante la ejecución de US-001 (alcance "Diagnóstico + limpiar referencias huérfanas" aprobado por Oriol):

| Referencia huérfana | Estado | Donde se hizo |
|---|---|---|
| `.claude/skills/traces/` (carpeta) | DELETE ✅ | Paso 2 de US-001 |
| `.claude/commands/poneglyph-insights.md` | DELETE ✅ | Paso 3 de US-001 |
| `MEMORY.md` global (líneas obsoletas sobre `trace-logger.ts` + `/traces` + `/cost`) | EDIT ✅ | Paso 4 de US-001 |

### Verificación

| Criterio de DoD | Estado |
|---|---|
| Decisión binaria registrada y ejecutada | ✅ CUT, ejecutado en `a5bbb18` |
| `bun test ./.claude/hooks/` pasa | ✅ 139 pass, 0 fail (verificado tras US-001) |
| `git status` limpio | ✅ Solo los 2 deletes esperados pendientes de commit |
| Commit en main | ✅ `a5bbb18` ya en `main` desde hace 24 días |
| `status: completed` | ✅ Actualizado en frontmatter |

### Impacto en historias posteriores

- **US-010** (decidir destino de `poneglyph-insights`): resuelta indirectamente por side-effect. Considerar cierre similar.
- **Riesgo de patrón**: el backlog completo (`audit-tasks/`) fue redactado sin verificar `git log` ni el estado actual del filesystem. Otras historias probablemente también se hayan vuelto no-ops. **Recomendación general antes de seguir**: revalidar premisa de cada historia al empezarla, no confiar en la auditoría sin verificar el estado actual.

## Notas

- Si el diagnóstico en US-001 fue ambiguo (no se identificó causa raíz en 45 min), ir directo a CUT
- Si decides CUT, NO borres los JSONL existentes en `~/.claude/traces/` — son barato de mantener y pueden ser útiles para análisis offline
- La skill `traces` y el comando `/traces` se evalúan en US-010 (junto con `poneglyph-insights`)

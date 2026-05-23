---
id: US-005
phase: 2.1
status: completed
estimate: 20m
actual: 25m
completed_at: 2026-05-23
blocks: [US-009]
blockedBy: [US-002]
priority: high
risk: low
---

# US-005 · CUT hook `parallelism-metrics.ts` (instrumentación sin señal)

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** eliminar el hook `parallelism-metrics.ts` y su comando asociado
**Para** dejar de pagar el coste de instrumentación que no produce datos útiles

## Contexto extendido

### Evidencia recogida

- `~/.claude/parallelism-metrics.jsonl` tiene **474 bytes** total (última actualización 2026-05-18)
- Contiene solo **4 entradas** y todas de una **única sesión**
- Ratio de batching observado: `0/1, 0/1, 0/1` — significa "0 batches sobre 1 oportunidad"
- El comando `/parallelism-insights` lee de este archivo — sin datos no produce nada útil
- El hook está registrado en `Stop` event en `settings.json`

### Por qué importa

Es un caso de manual de "diseño bueno, ejecución insuficiente":
- Conceptualmente, medir paralelismo es valioso (Commandment VII — performance)
- Pero con 4 muestras en >2 meses, **no hay señal estadística**
- El hook consume tiempo en cada Stop (cálculo + escritura JSONL) sin beneficio
- El comando `/parallelism-insights` es una promesa que no se cumple

### Alternativas si en el futuro queremos métricas de paralelismo

1. **Reconstruir con propósito**: si en 6 meses hay sospecha de baja paralelización, instrumentar de nuevo con criterios claros (batch ratio target, umbral de alarma)
2. **Usar herramientas externas**: console.anthropic.com no expone esto, pero podría hacerse análisis offline sobre traces si trace-logger se repara
3. **Aceptar que no se mide**: el problema "paralelización subóptima" se puede detectar a ojo en sesiones puntuales

## Análisis — pros y contras

### Pros de cortar

- **Reduce 1 hook + 1 archivo de log + 1 comando** = -35 líneas TS + -40 líneas MD
- **Elimina ruido en `settings.json`** — un Stop hook menos
- **Es honesto**: 4 muestras en 2 meses no es observabilidad, es teatro
- **Coherente con el principio "no zombis"** del replanteo
- **Sin riesgo de impacto en sesiones reales** — el hook no influye en decisiones, solo registra

### Contras de cortar

- **Pierdes el slot de observabilidad** para paralelismo — si más adelante quieres medirlo, hay que reconstruir
- **El comando `/parallelism-insights`** queda huérfano, hay que eliminarlo también (cascade simple)
- **Si en realidad la instrumentación está bien y el problema es que no se llama el evento Stop**, cortarlo enmascara un problema más grande (relación con US-001/US-002 sobre trace-logger)

### Mitigación de contras

- Es trivial reconstruir un hook simple de métricas en el futuro si hace falta
- La cascade del comando se atiende en mismo PR
- Si US-002 decide REPARAR trace-logger y se descubre que el problema era genérico de Stop hooks, este hook se podría rescatar — pero esto se evalúa **después** de US-002, no antes

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Existen otros consumidores del archivo `parallelism-metrics.jsonl` que rompen | Baja | Bajo | `Grep "parallelism-metrics" .claude/` antes de cortar |
| El comando `/parallelism-insights` se invoca en algún workflow oculto | Muy baja | Bajo | `Grep "parallelism-insights" .claude/` |
| Cortar antes de US-002 (reparación de trace-logger) elimina datos potencialmente útiles | Media | Bajo | Esperar a US-002 — esta historia está bloqueada por ella |

## Pasos técnicos detallados

### Paso 1 — Verificar dependencias (5 min)

```bash
Grep "parallelism-metrics" .claude/         # buscar referencias
Grep "parallelism-insights" .claude/        # buscar referencias al comando
Grep "parallelismRatio" .claude/            # campo que el hook emite
```

**Esperado**:
- 1 archivo `.claude/hooks/parallelism-metrics.ts`
- 1 entrada en `.claude/settings.json`
- 1 archivo `.claude/commands/parallelism-insights.md`
- Posible referencia desde `trace-logger.ts` (mira si lee parallelismRatio)
- Posible mención en CLAUDE.md o MEMORY.md

### Paso 2 — Eliminar el hook (3 min)

```bash
Bash: rm .claude/hooks/parallelism-metrics.ts
```

Si existe test asociado:
```bash
Bash: rm .claude/hooks/__tests__/parallelism-metrics.test.ts   # si existe
```

### Paso 3 — Eliminar el registro en settings.json (5 min)

```bash
Edit .claude/settings.json
```

Quitar la entrada del Stop hook que apunta a `parallelism-metrics.ts`. Si la entrada está en un array de hooks, solo eliminar ese item — preservar el resto del array.

**Verificación**:
```bash
Grep "parallelism" .claude/settings.json    # debe devolver 0
```

### Paso 4 — Decisión sobre el comando `/parallelism-insights` (incluida aquí o en US-009/US-010)

El comando `parallelism-insights.md` queda huérfano. Decisión: eliminarlo aquí mismo o tratarlo en su propia historia.

**Recomendación**: eliminarlo aquí (cascade lógico). Si se prefiere tratarlo aparte, marcar US-009 como bloqueado por esto.

```bash
Bash: rm .claude/commands/parallelism-insights.md
```

### Paso 5 — Decidir sobre el archivo de log existente (2 min)

`~/.claude/parallelism-metrics.jsonl` (474 bytes) — ¿qué hacer?

**Recomendación**: dejarlo. No molesta, es historia. Si limpieza obsesiva: `rm ~/.claude/parallelism-metrics.jsonl`.

### Paso 6 — Tests (3 min)

```bash
Bash: bun test ./.claude/hooks/
```

Debe pasar (los tests del hook eliminado ya no existen, los del resto deben seguir verdes).

### Paso 7 — Commit (2 min)

```
refactor(hooks): remove parallelism-metrics — no statistical signal

- 474 bytes of total log content (4 entries, 1 session) in 2+ months
- Ratio 0/1 in all entries: instrumentation insufficient for decisions
- Removed: hook .ts, settings.json registration, /parallelism-insights command

If parallelism observability is needed later, reconstruct with clear targets
(batch ratio thresholds, alarm criteria).
```

## Criterios de aceptación

- [ ] Archivo `.claude/hooks/parallelism-metrics.ts` no existe
- [ ] `Grep "parallelism" .claude/settings.json` → 0 resultados
- [ ] Archivo `.claude/commands/parallelism-insights.md` no existe
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Smoke test: 1 sesión nueva no falla mencionando el hook eliminado
- [ ] Commit realizado con mensaje descriptivo

## Definition of Done

1. Hook + comando + registro eliminados
2. Tests del proyecto pasan
3. `git diff` revisado a mano antes de commit
4. Commit en main o branch dedicada
5. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura hook, registro y comando
```

Riesgo bajo, ningún consumidor crítico.

## Notas

- Esta historia depende de US-002 porque si trace-logger se repara y revela que el problema era Stop-hook genérico, este hook podría rescatarse. Solo se ejecuta tras decisión de US-002.
- Si US-002 = CUT trace-logger, esta historia se ejecuta sin más
- Si US-002 = REPARAR trace-logger Y se observa después que parallelism-metrics también vuelve a la vida → revaluar antes de cortar
- Cualquier referencia a `parallelismRatio` en `trace-logger.ts` debe revisarse: si el campo se calcula localmente en trace-logger (no depende de este hook), no afecta. Si lo lee del JSONL externo, también puede simplificarse aprovechando este corte

## Resolución de la dependencia US-002 (commit 99ef23b)

**La premisa del `blockedBy` quedó obsoleta antes de ejecutar esta HU.** US-002 se cerró el 2026-05-23 como **CUT no-op por side-effect** — `trace-logger.ts` fue eliminado el 2026-04-29 en commit `a5bbb18` (decisión deliberada de Oriol por datos corruptos, double-counting, pipeline sin valor). El escenario "REPARAR trace-logger y revaluar este hook" YA NO PUEDE OCURRIR: no hay nada que rescatar. La rama "Si US-002 = CUT trace-logger, esta historia se ejecuta sin más" es la única vigente y se cumple.

Adicionalmente, `lead-parallelism-gate.ts` (PreToolUse hook independiente que escribe a `~/.claude/parallelism-skips.jsonl`) **NO se ve afectado y permanece intacto** — es un sistema distinto y no consume `parallelism-metrics.jsonl`.

## Resultado

### Cifras empíricas REALES del JSONL antes del corte

Re-medidas el 2026-05-23 (las del backlog estaban desactualizadas):

| Métrica | Backlog (mayo 2026) | Real al cortar | Veredicto |
|---|---|---|---|
| Bytes | 474 | 2528 | Más alto, pero sigue siendo trivial |
| Entradas | 4 | 16 | 4× más muestras |
| Sesiones únicas | 1 | 4 | 4× más sesiones |
| Cobertura temporal | — | 2026-05-17 → 2026-05-23 (6 días) | — |
| Ratios observados | `0/1, 0/1, 0/1` | `[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]` | **Sin variación — confirmado "sin señal"** |

**Decisión empírica**: aunque el volumen creció 4× respecto al backlog, los ratios siguen siendo uniformemente 0. Con 16 muestras y cero variabilidad, el hook sigue siendo instrumentación sin señal estadística. El CUT se confirma.

### Artefactos eliminados

| Path | Tipo | Líneas |
|---|---|---|
| `.claude/hooks/parallelism-metrics.ts` | Stop hook | 145 |
| `.claude/commands/parallelism-insights.md` | Slash command | 51 |
| `.claude/settings.json` entrada Stop | Configuración (entry completa de array) | 10 |

**Total eliminado**: 206 líneas.

### Artefactos actualizados (referencias muertas saneadas)

| Path | Línea | Cambio |
|---|---|---|
| `CLAUDE.md` | 131 | Quitar mención de `/parallelism-insights` en la guía de delegación |
| `.claude/rules/bootstrap-lead.md` | 40 | Sustituir "the `/parallelism-insights` metric monitors it" por "rely on judgment" |

### Decisiones de cascade

| Eje | Decisión | Justificación |
|---|---|---|
| Skill `parallelism-insights` separada | N/A | NO existía como skill independiente; aparecía en `available-skills` por symlink desde el command. Al borrar el command, desaparece automáticamente. |
| `~/.claude/parallelism-metrics.jsonl` histórico | **CONSERVAR** | Recomendación HU, ocupa <3 KB, recuperable como dato offline si en el futuro reconstruimos métricas. |
| `lead-parallelism-gate.ts` (NO listado en HU) | **NO TOCAR** | Hook independiente vivo (PreToolUse sobre Agent), escribe a `parallelism-skips.jsonl` distinto. Cero acoplamiento con `parallelism-metrics`. |
| Memorias de agentes con `parallelismRatio` obsoleto | **NO TOCAR** | Scope de US-023 (update-memory-global). |
| `poneglyph-insights.md` (preexisting `D`) | **NO TOCAR** | Scope de US-010 (decide-poneglyph-insights). |

### Verificación post-cambios

| Criterio | Antes | Después | OK |
|---|---|---|---|
| `bun test ./.claude/hooks/` | 139 pass / 0 fail | 139 pass / 0 fail | ✅ |
| `settings.json` parseable | ✅ | ✅ | ✅ |
| `Grep parallelism-metrics .claude/` | 3 hits | 0 hits | ✅ |
| `Grep parallelism-insights .claude/` | 2 hits | 0 hits | ✅ |
| `lead-parallelism-gate.ts` intacto | ✅ | ✅ | ✅ |
| Archivos preexistentes `D` intactos | ✅ | ✅ | ✅ |

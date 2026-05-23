---
id: US-004
phase: 1
status: completed
completed_at: 2026-05-23
estimate: 20m
blocks: []
blockedBy: []
priority: medium
risk: low
---

# US-004 · Comparar `/cost` (local) con `console.anthropic.com` dashboard (autoritativo)

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** verificar que las cifras de `/cost` coinciden razonablemente con la facturación real de Anthropic
**Para** saber si las decisiones de optimización de coste se basan en datos fiables o en una contabilidad rota

## Contexto extendido

### Evidencia recogida

- Una sesión real del 19 abril reportó $211 → $228 → $237 en 3 entradas consecutivas del JSONL — son acumulados de la misma sesión, no 3 sesiones distintas
- Mi exploración inicial reportó "$13.5K en abril" — probablemente inflado por contar acumulados como independientes
- `trace-logger.ts` lleva 31 días sin escribir (US-001), por lo que mayo no tiene datos locales
- El cálculo de coste en `trace-logger.ts` puede usar precios que no se actualizan (precios obsoletos = cifras incorrectas en mayo)

### Por qué importa

Esta es la única validación externa que tenemos antes de Fase 2:
1. **Si los datos locales son fiables**: podemos medir el ahorro real tras los cortes
2. **Si los datos locales están inflados**: todo el discurso de "sistema caro" pierde fuerza y la auditoría debe re-calibrarse
3. **Si los datos locales están deflactados**: el problema es peor de lo que pensamos
4. **Si trace-logger está roto pero hay otros sistemas de coste**: identificar la fuente alternativa

### Caso especial: si US-002 decide CUT trace-logger

Si trace-logger se elimina, esta validación pierde mucho de su sentido. Sin embargo, mantiene 2 utilidades:
- Establecer una **baseline pre-cortes** usando la única fuente fiable (console)
- Aprender a usar el dashboard de Anthropic como métrica principal a partir de ahora

## Análisis — pros y contras de hacer esta verificación

### Pros

- **Es barata** (15-20 min) y de bajo riesgo
- **Aporta credibilidad al análisis**: si afirmamos "$X gastados" basado en traces locales sin contrastar, perdemos terreno frente a un escéptico
- **Establece baseline real**: el coste promedio diario actual (según Anthropic) es el punto de comparación tras los cortes
- **Aprende un workflow**: comparar console.anthropic.com vs métricas locales será necesario cada vez que se cuestione el coste

### Contras

- **No bloquea nada**: incluso si los datos locales están rotos, las decisiones cualitativas (cortar componentes muertos) se sostienen
- **Si `/cost` está totalmente roto (consecuencia de US-001)**, ejecutar `/cost` puede no devolver nada útil → la comparación se vuelve "qué dice console" sin contraste

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Console reporta datos con delay (horas) | Alta | Bajo | Comparar período cerrado (mes anterior), no período en curso |
| `/cost` no funciona (porque trace-logger está roto) | Alta | Bajo | Aceptar y usar solo console como baseline |
| El usuario no tiene acceso a console (auth caducada) | Baja | Bajo | Validar acceso primero, si no, marcar como TODO |
| Diferencias entre planes (subscription vs pay-as-you-go) confunden el cálculo | Media | Bajo | Pedir vista detallada en console, no resumen mensual |

## Pasos técnicos detallados

### Paso 1 — Capturar snapshot local (5 min)

```
/cost
```

Guardar output literal en sección "Resultado" de este archivo.

Si `/cost` falla o devuelve datos vacíos: anotar y avanzar al Paso 2 (el problema es esperado dado US-001).

```
/traces
```

Capturar también, para tener referencia de "qué cree el sistema local que ha pasado".

### Paso 2 — Capturar snapshot autoritativo (10 min)

1. Navegador: [console.anthropic.com](https://console.anthropic.com)
2. Auth si necesario
3. Menú Usage o Billing → filtrar por **mes anterior completo** (abril 2026) — no el mes en curso que tiene delays
4. Capturar:
   - Total de coste del mes
   - Número de sesiones / requests si está disponible
   - Breakdown por modelo (Opus vs Sonnet vs Haiku) si está disponible
5. Capturar el mismo dato para **mes en curso parcial** (mayo 2026, hasta hoy)

### Paso 3 — Calcular divergencia (3 min)

```
Divergencia = (local - console) / console × 100
```

Documentar:
- Abril: divergencia ___%
- Mayo: divergencia ___% (puede ser 100% si trace-logger no escribió)

### Paso 4 — Documentar (2 min)

Rellenar sección "Resultado" con tabla.

## Criterios de aceptación

- [ ] Sección "Resultado" con tabla numérica
- [ ] Veredicto: datos locales FIABLES (<20% divergencia) / INFLADOS / DEFLATADOS / NO_DISPONIBLES
- [ ] Baseline pre-cortes establecido: coste promedio diario según console (último mes completo)
- [ ] Si los datos locales son sospechosos, marcar como input para US-002 (refuerza decisión CUT)

## Definition of Done

1. Tabla de resultado rellena
2. Veredicto claro sobre fiabilidad de `/cost`
3. Baseline numérica establecida ($X/día según console)

## Rollback plan

No aplica — historia 100% lectura externa, sin modificaciones al repo.

## Resultado

### Premisa de la HU: obsoleta en dos frentes

La HU asumía que existirían dos fuentes de datos comparables: `/cost` local + `console.anthropic.com`. **Ninguna aplica para este usuario en este momento**:

1. **Local — comandos no registrados**. Tras commit `a5bbb18` (2026-04-29, *"refactor(hooks): eliminar pipeline trace/scoring/patterns"*, 7236 deletions), el pipeline entero de trazas fue eliminado. Verificación literal:
   - `Glob .claude/commands/*cost*` → 0 hits
   - `Glob .claude/commands/*traces*` → 0 hits
   - `Glob .claude/hooks/**/trace-logger*` → 0 hits
   - `Glob .claude/skills/traces*` → 0 hits (la skill `traces`, donde se movió el command en `898eb14`, también fue eliminada del working tree)
   - `Grep cost-budget` → solo `.claude/config/cost-budget.json` huérfano (la lib `cost-budget.ts` se eliminó en `a5bbb18`)
2. **Console — usuario no usa la API**. Acceso confirmado: `console.anthropic.com` reporta **$0** para abril y mayo. El usuario tiene contratado **Claude Max ($100/mes)**, suscripción flat, sin facturación por uso de API. La métrica USD del dashboard no representa el coste real de este sistema.

### Tabla literal

| Métrica                          | `/cost` local | console.anthropic.com | Divergencia |
|----------------------------------|---------------|-----------------------|-------------|
| Abril 2026 (mes completo)        | N/A (1)       | $0 (2)                | N/A         |
| Mayo 2026 (hasta hoy)            | N/A (1)       | $0 (2)                | N/A         |
| Coste promedio/día último mes    | N/A (1)       | $0 (2)                | N/A         |

(1) Comandos `/cost` y `/traces` no registrados; `trace-logger.ts` eliminado en commit `a5bbb18` (2026-04-29). El sistema local **no produce métrica de coste**. No es "$0" — es ausencia de instrumentación.

(2) Usuario en plan flat **Claude Max ($100/mes)**, no API pay-as-you-go. El dashboard de console solo registra consumo de API. Para este usuario, el coste real es la suscripción mensual, no el contador del dashboard.

### Veredicto

- **Datos locales fiables**: `NO_DISPONIBLES` (no hay datos locales, no que sean poco fiables)
- **Baseline pre-cortes en USD**: **NO APLICA** — el coste es fijo y exógeno al sistema. Suscripción Claude Max = $100/mes ≈ $3.33/día independientemente de cuánto se use Claude Code.
- **Baseline pre-cortes en métricas no-USD**: a establecer en Fase 2 con instrumentación nueva si se considera necesario (ver Acción derivada).

### Acción derivada

1. **Refuerza la decisión CUT de US-002**: no tiene sentido reparar `trace-logger.ts` para "validar coste" — el coste para este usuario es la suscripción fija, no algo que el sistema pueda medir desde dentro.
2. **El audit debe re-calibrarse**: el "ahorro" de Fase 2 no se medirá en $/mes. Métricas alternativas relevantes:
   - **Tokens consumidos por sesión típica** (proxy de eficiencia, aunque solo medible si se reinstrumenta)
   - **Hits de rate limit** (5h block, weekly limit) — señal directa de "sistema demasiado pesado"
   - **Latencia de respuesta** (cada token de prompt cuesta tiempo, no $)
   - **Volumen de orquestación inútil** (delegaciones a subagentes que no aportan)
3. **Re-snapshot US-024 (final de Fase 2)**: no comparar USD. Comparar las métricas no-USD elegidas arriba — o aceptar que el éxito es cualitativo (menos ruido en contexto, menos componentes muertos).

## Notas

- **Anomalía documentada**: `cost-budget.json` sobrevive como archivo huérfano en `.claude/config/` con precios de Opus/Sonnet/Haiku y budgets ($1/$5 sesión, $20/$50 día). No hay lib activa que lo lea desde `a5bbb18`. Candidato a inclusión en US futura de limpieza de configs muertos, sin abrir HU nueva aquí.
- **Sobre la HU original**: la línea de las Notas que decía *"Si tienes plan Max o suscripción flat, la métrica del dashboard puede ser distinta (request count en vez de USD). En ese caso adaptar la comparación a 'tokens consumidos' o 'requests'"* anticipó correctamente este caso. La HU se ejecuta cerrando esa rama del árbol de decisión.
- **No se guardaron screenshots**: el usuario reportó verbalmente $0; no es un valor que requiera defensa documental — la causa (plan flat) es la información relevante, no el número.
- **Sobre los ejemplos de la HU** (`$211 → $228 → $237` en una sesión de 19 abril): proceden de una observación de momento de redacción del backlog; el sistema que producía esas cifras (`trace-logger.ts` con double-counting) ya no existe. Esos números no se reproducen ni se contrastan en este cierre.

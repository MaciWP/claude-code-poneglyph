---
description: Dashboard de datos acumulados — traces, errores, scores de agentes y patrones descubiertos
---

Lee y renderiza los datos acumulados del sistema de orquestacion como un dashboard de texto.

## Fuentes de datos

| Archivo | Contenido |
|---------|-----------|
| `~/.claude/traces/*.jsonl` | Traces de ejecucion (1 linea JSON por sesion) |
| `~/.claude/error-patterns.jsonl` | Patrones de error conocidos |
| `~/.claude/agent-scores.jsonl` | Scores de rendimiento por agente |
| `~/.claude/agent-trust.jsonl` | Niveles de confianza por agente y tipo de tarea |
| `~/.claude/patterns.jsonl` | Patrones de workflow descubiertos |

## Instrucciones

### 1. Traces recientes

1. Usa `Glob` para encontrar `~/.claude/traces/*.jsonl`
2. Lee los archivos mas recientes
3. Parsea las ultimas 10 entradas (orden cronologico inverso)
4. Muestra tabla:

| Fecha | Prompt (60 chars) | Model | Tokens | Cost | Duration | Status |
|-------|-------------------|-------|--------|------|----------|--------|

Si no hay archivos: mostrar "Sin datos de traces aun."

### 2. Top errores

1. Lee `~/.claude/error-patterns.jsonl`
2. Parsea cada linea como JSON con campos: `normalizedMessage`, `category`, `occurrences`, `successRate`, `lastSeen`
3. Ordena por `occurrences` descendente, toma top 5
4. Muestra tabla:

| # | Error (normalizado) | Categoria | Ocurrencias | Success Rate | Ultimo |
|---|---------------------|-----------|-------------|--------------|--------|

Si el archivo no existe o esta vacio: mostrar "Sin patrones de error registrados."

### 3. Scores de agentes

1. Lee `~/.claude/agent-scores.jsonl`
2. Parsea cada linea como JSON con campos: `agent`, `taskType`, `compositeScore`, `successRate`, `trend`, `sampleSize`
3. Ordena por `compositeScore` descendente
4. Muestra tabla:

| Agente | Tipo de tarea | Score | Success Rate | Tendencia | Muestras |
|--------|---------------|-------|--------------|-----------|----------|

Si el archivo no existe o esta vacio: mostrar "Sin scores de agentes aun."

### 4. Agent trust levels

1. Lee `~/.claude/agent-trust.jsonl`
2. Parsea cada linea como JSON con campos: `agent`, `taskType`, `level`, `score`, `consecutiveSuccesses`, `totalSessions`, `lastActivity`
3. Ordena por `level` descendente, luego por `score` descendente
4. Para el campo Level, muestra nombre descriptivo segun valor numerico:
   - 0 → `0 — Nuevo`
   - 1 → `1 — Basico`
   - 2 → `2 — Intermedio`
   - 3 → `3 — Confiable`
5. Muestra tabla:

| Agente | Tipo de tarea | Level | Score | Sesiones | Ultima actividad |
|--------|---------------|-------|-------|----------|-----------------|

Si el archivo no existe o esta vacio: mostrar "Sin datos de agent trust aun."

### 5. Patrones descubiertos

1. Lee `~/.claude/patterns.jsonl`
2. Parsea cada linea como JSON con campos: `type`, `pattern` (objeto con `agents`, `skills`, `taskType`), `confidence`, `effectSize`, `sampleSize`
3. Ordena por `confidence` descendente, toma top 10
4. Muestra tabla:

| Tipo | Agentes/Skills | Task Type | Confianza | Efecto | Muestras |
|------|----------------|-----------|-----------|--------|----------|

Si el archivo no existe o esta vacio: mostrar "Sin patrones descubiertos aun."

### 6. Resumen final

Al final, muestra un bloque de resumen:

- Total de traces registrados
- Total de patrones de error conocidos
- Agentes con score disponible
- Entradas de agent trust registradas
- Patrones de workflow descubiertos

Si TODOS los archivos estan vacios o no existen, mostrar:

> **Sin datos acumulados.** Ejecuta algunas sesiones con Claude Code para que los hooks recopilen traces, errores y scores automaticamente.

## Reglas

- Si un archivo no existe, NO mostrar error — solo "Sin datos aun" para esa seccion
- Truncar textos largos (prompts a 60 chars, mensajes de error a 80 chars)
- Usar formato de tablas markdown para todo el output
- No repetir datos crudos JSON — solo tablas formateadas
- Redondear costos a 4 decimales, porcentajes a 1 decimal

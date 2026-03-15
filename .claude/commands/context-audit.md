---
description: Audita uso de contexto — distribucion de tokens por herramienta, waste estimado y recomendaciones
---

Analiza como se consume el contexto en tus sesiones de Claude Code usando los traces acumulados.

Instrucciones:
1. Usa `Glob` para encontrar `~/.claude/traces/*.jsonl`
2. Lee y parsea TODOS los archivos de traces — cada linea es JSON con campos: `ts`, `tokens`, `inputTokens`, `outputTokens`, `toolCalls`, `model`, `costUsd`
3. Calcula y muestra estas metricas en tablas:

**Tabla 1: Resumen Global**
- Total de sesiones analizadas
- Total tokens consumidos (input + output)
- Total input tokens, total output tokens
- Ratio output/input (indica cuanto contexto generan las herramientas vs lo que el usuario y modelo producen)

**Tabla 2: Distribucion por Herramienta**
Para cada sesion, examina el campo `toolCalls` (array de objetos con `tool` y `outputTokens` o estimacion por longitud de output). Agrupa por herramienta y muestra:
- Columnas: Tool, Calls (total invocaciones), Est. Output Tokens, % del Total, Avg per Call
- Ordenar por Est. Output Tokens descendente
- Herramientas tipicas: Read, Grep, Glob, Bash, Edit, Write, LSP, WebSearch, WebFetch
- Si `toolCalls` no tiene `outputTokens`, estimar con heuristica: contar caracteres del output del tool y dividir por 4

**Tabla 3: Distribucion por Tamano de Sesion**
Clasificar cada sesion por su total de tokens:
- Small: < 50K tokens
- Medium: 50K - 200K tokens
- Large: > 200K tokens
Columnas: Categoria, Sesiones, % del Total Sesiones, Tokens Acumulados, % del Total Tokens, Avg Tokens/Sesion

**Tabla 4: Estimacion de Waste**
Estimar el porcentaje de tokens "desperdiciados" — outputs de herramientas que se compactan y no contribuyen al resultado final:
- Calcular: waste_ratio = (total tool output tokens) / (total tokens consumidos) * 100
- Esto es una aproximacion: los outputs de herramientas (Read de archivos completos, Grep con muchos resultados, Bash con output extenso) ocupan contexto que luego se compacta
- Mostrar: Total Tool Output Tokens, Total Session Tokens, Waste Ratio %

**Tabla 5: Top 5 Sesiones con Mayor Consumo**
- Las 5 sesiones con mas tokens totales
- Columnas: Fecha, Tokens, Input, Output, Modelo, Costo USD
- Esto ayuda a identificar sesiones ineficientes

4. Mostrar recomendaciones basadas en el waste ratio:

| Waste Ratio | Recomendacion |
|-------------|---------------|
| < 20% | "Context usage is efficient — tool outputs are well-targeted" |
| 20% - 50% | "Consider using targeted reads instead of full file reads. Use Grep with head_limit, Read with offset/limit for large files" |
| > 50% | "High context waste — review tool usage patterns. Prefer Grep over Read for searching. Use Glob to find specific files instead of reading directories. Batch independent operations" |

5. Nota final:

> Los estimados de waste son heuristicos. El waste real depende de como Claude Code compacta el contexto internamente. Un waste ratio alto no es necesariamente malo si las sesiones son exitosas, pero indica oportunidad de optimizacion.

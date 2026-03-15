---
description: Analiza impacto real de la orquestacion — speedup, success rate, cost efficiency desde traces
---

Analiza el impacto real de Poneglyph en tu workflow usando los traces acumulados.

Instrucciones:
1. Usa `Glob` para encontrar `~/.claude/traces/*.jsonl`
2. Lee y parsea TODOS los archivos de traces — cada linea es JSON con campos: `ts`, `costUsd`, `tokens`, `inputTokens`, `outputTokens`, `model`, `durationMs`, `status`, `prompt`, `agents`, `skills`, `toolCalls`, `filesChanged`
3. Si existe `~/.claude/patterns.jsonl`, lee y parsea — cada linea es JSON con campos: `type`, `pattern`, `outcome` (con `successRate`, `avgTokens`, `avgDuration`, `avgCost`), `confidence`, `effectSize`, `sampleSize`
4. Si existe `~/.claude/agent-scores.jsonl`, lee y parsea — campos: `agent`, `taskType`, `compositeScore`, `successRate`, `trend`, `sampleSize`
5. Calcula y muestra estas metricas en tablas:

**Tabla 1: Overview**
- Total sesiones, sesiones exitosas (status="completed"), success rate global
- Costo total, costo medio por sesion exitosa
- Duracion media (en segundos), tokens medios por sesion

**Tabla 2: Trend (ultimos 7 dias vs 7 dias anteriores)**
- Success rate: periodo actual vs anterior (con flecha ↑↓→)
- Costo medio: actual vs anterior
- Duracion media: actual vs anterior
- Tokens medios: actual vs anterior

**Tabla 3: Por modelo**
Desglose de sesiones, success rate y costo medio por modelo (opus, sonnet, haiku, unknown)

**Tabla 4: Agent Performance** (solo si agent-scores.jsonl existe)
- Ranking por compositeScore descendente
- Columnas: Agent, Task Type, Score, Success Rate, Trend, Samples

**Tabla 5: Patterns descubiertos** (solo si patterns.jsonl existe)
- Top 5 patterns por confidence descendente
- Columnas: Type, Pattern (agents/skills resumidos), Success Rate, Confidence, Effect Size, Samples

6. Nota final:

> **Contexto METR**: Investigacion de METR (enero 2026) encontro que desarrolladores son 19% mas lentos con AI tools en promedio. Los datos arriba muestran el impacto especifico de Poneglyph en TU workflow. Compara tu success rate y trend para evaluar si la orquestacion esta generando valor real.

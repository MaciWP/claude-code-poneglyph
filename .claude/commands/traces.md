---
description: Muestra resumen de traces de ejecucion recientes
---

Lee los archivos JSONL del directorio `~/.claude/traces/` (ultimos 7 dias).

Cada linea es un JSON con formato:
```json
{"ts":"ISO","sessionId":"...","prompt":"...","agents":["builder"],"skills":["api-design"],"tokens":4500,"inputTokens":1500,"outputTokens":3000,"costUsd":0.048,"durationMs":56250,"model":"sonnet","status":"completed","toolCalls":12,"filesChanged":3}
```

Instrucciones:
1. Usa `Glob` para encontrar archivos `*.jsonl` en `~/.claude/traces/`
2. Lee los archivos de los ultimos 7 dias
3. Parsea cada linea como JSON
4. Muestra una tabla resumen con columnas: Fecha, Prompt (primeros 60 chars), Model, Tokens, Cost, Agentes, Skills, Tool Calls, Files Changed, Status
5. Al final muestra estadisticas agregadas:
   - Total de sesiones
   - Tokens totales (input/output breakdown)
   - Costo total estimado
   - Desglose por modelo (sessions, tokens, cost)
   - Agentes mas utilizados (top 5)
   - Skills mas utilizadas (top 5)
   - Sesiones por dia

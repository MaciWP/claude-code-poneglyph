---
description: Muestra resumen de traces de ejecucion recientes
---

Lee los archivos JSONL del directorio `~/.claude/traces/` (ultimos 7 dias).

Cada linea es un JSON con formato:
```json
{"ts":"ISO","sessionId":"...","prompt":"...","agents":["builder"],"skills":["api-design"],"tokens":0,"costUsd":0,"durationMs":0,"status":"completed"}
```

Instrucciones:
1. Usa `Glob` para encontrar archivos `*.jsonl` en `~/.claude/traces/`
2. Lee los archivos de los ultimos 7 dias
3. Parsea cada linea como JSON
4. Muestra una tabla resumen con columnas: Fecha, Prompt (primeros 60 chars), Agentes, Skills, Status
5. Al final muestra estadisticas agregadas:
   - Total de sesiones
   - Agentes mas utilizados (top 5)
   - Skills mas utilizadas (top 5)
   - Sesiones por dia

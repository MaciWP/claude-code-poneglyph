---
description: Muestra resumen de traces de ejecucion recientes y costos acumulados
---

Lee TODOS los archivos JSONL del directorio `~/.claude/traces/`.

Cada linea es un JSON con formato:
```json
{"ts":"ISO","sessionId":"...","prompt":"...","agents":["builder"],"skills":["api-design"],"tokens":4500,"inputTokens":1500,"outputTokens":3000,"costUsd":0.048,"durationMs":56250,"model":"sonnet","status":"completed","toolCalls":12,"filesChanged":3}
```

Instrucciones:
1. Usa `Glob` para encontrar archivos `*.jsonl` en `~/.claude/traces/`
2. Lee y parsea todos los archivos
3. Muestra una tabla resumen de los ultimos 7 dias con columnas: Fecha, Prompt (primeros 60 chars), Model, Tokens, Cost, Agentes, Skills, Tool Calls, Files Changed, Status
4. Muestra estadisticas agregadas (ultimos 7 dias):
   - Total de sesiones
   - Tokens totales (input/output breakdown)
   - Costo total estimado
   - Desglose por modelo (sessions, tokens, cost)
   - Agentes mas utilizados (top 5)
   - Skills mas utilizadas (top 5)
   - Sesiones por dia
5. Muestra seccion de costos acumulados con desglose temporal:
   - **Hoy**: costo, tokens (input/output) del dia actual
   - **Ultima semana**: ultimos 7 dias
   - **Ultimo mes**: ultimos 30 dias
   - **Total acumulado**: todo el historial
6. Muestra desglose de costos por modelo: sesiones, tokens y costo para cada modelo (opus, sonnet, haiku)
7. Nota al final: "Los costos son estimaciones basadas en conteo de caracteres. Para facturacion real, consultar console.anthropic.com"

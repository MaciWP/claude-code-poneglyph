---
description: Calcula costo acumulado de sesiones de Claude Code
---

Lee TODOS los archivos JSONL del directorio `~/.claude/traces/`.

Cada linea es un JSON con campos `costUsd`, `tokens`, `inputTokens`, `outputTokens` y `model`.

Instrucciones:
1. Usa `Glob` para encontrar `~/.claude/traces/*.jsonl`
2. Lee y parsea todos los archivos
3. Suma `costUsd`, `tokens`, `inputTokens` y `outputTokens` de todas las entradas
4. Muestra desglose:
   - **Hoy**: costo, tokens (input/output) del dia actual
   - **Ultima semana**: ultimos 7 dias
   - **Ultimo mes**: ultimos 30 dias
   - **Total acumulado**: todo el historial
5. Muestra desglose por modelo:
   - Sesiones, tokens y costo para cada modelo (opus, sonnet, haiku)
6. Nota al final: "Los costos son estimaciones basadas en conteo de caracteres. Para facturacion real, consultar console.anthropic.com"

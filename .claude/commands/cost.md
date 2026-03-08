---
description: Calcula costo acumulado de sesiones de Claude Code
---

Lee TODOS los archivos JSONL del directorio `~/.claude/traces/`.

Cada linea es un JSON con campos `costUsd` y `tokens`.

Instrucciones:
1. Usa `Glob` para encontrar `~/.claude/traces/*.jsonl`
2. Lee y parsea todos los archivos
3. Suma `costUsd` y `tokens` de todas las entradas
4. Muestra desglose:
   - **Hoy**: costo y tokens del dia actual
   - **Ultima semana**: ultimos 7 dias
   - **Ultimo mes**: ultimos 30 dias
   - **Total acumulado**: todo el historial
5. Nota al final: "Los costos son estimaciones del trace logger. Para facturacion real, consultar console.anthropic.com"

> **Nota**: Los campos `costUsd` y `tokens` se populan segun disponibilidad en el hook de Stop.
> Si los valores son 0, el hook no pudo extraer esta informacion de la sesion.

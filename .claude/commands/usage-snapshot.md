---
description: Genera telemetría diaria de Claude Code + detección de anomalías (Capas 1 y 2)
---

Ejecuta el pipeline de telemetría de Claude Code (Capas 1 y 2):

1. Ejecuta `bun .claude/scripts/usage-snapshot.ts` desde el directorio raíz del repo (`/Users/oriol/Desktop/Bjumper/PERSONAL/REPO/claude-code-poneglyph`). Este script:
   - Lee todos los traces de `~/.claude/traces/*.jsonl`
   - Agrega datos por día con costes incrementales por modelo
   - Escribe `daily.json`, `aggregates.json`, y `dashboard.html` en `.claude/data/usage/`

2. Ejecuta `bun .claude/scripts/anomaly-detector.ts` desde el mismo directorio. Este script:
   - Lee `daily.json` y `aggregates.json`
   - Aplica 13 reglas deterministas
   - Escribe `alerts.json` en `.claude/data/usage/`

3. Imprime el resumen: día más reciente + alertas críticas del output de los scripts.

4. Informa al usuario:
   - Para ver el dashboard: `open .claude/data/usage/dashboard.html`
   - Para narrativa IA: `/usage-insights`

Si algún script falla, muestra el error completo y no reportes éxito parcial.

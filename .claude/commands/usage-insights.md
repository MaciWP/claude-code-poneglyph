---
description: Genera narrativa IA con insights y recomendaciones sobre el uso de Claude Code (Capa 3)
---

Genera un análisis narrativo IA del uso de Claude Code:

1. Verifica que existan `aggregates.json` y `alerts.json` en `.claude/data/usage/`. Si no existen o tienen más de 24h, ejecuta primero `/usage-snapshot`.

2. Delega al agente `builder` con el siguiente contexto de entrada (instrúyele a leer estos archivos como primera acción):
   - `.claude/data/usage/daily.json` — timeseries diario
   - `.claude/data/usage/aggregates.json` — health + ROI + config
   - `.claude/data/usage/alerts.json` — anomalías detectadas
   - `.claude/agent-memory/builder/MEMORY.md` — lecciones del builder
   - `.claude/agent-memory/scout/MEMORY.md` — lecciones del scout
   - `.claude/agent-memory/reviewer/MEMORY.md` — lecciones del reviewer
   - `.claude/config/cost-budget.json` — contexto de presupuesto

3. El builder debe generar `.claude/data/usage/insights.md` con las siguientes secciones:
   - **Resumen ejecutivo** — 3-5 frases: salud general, tendencia, top riesgo (<100 palabras)
   - **Win del mes** — patrón positivo con evidencia numérica (<80 palabras)
   - **Top 3 problemas** — por severidad, con causa raíz hipotética y acción concreta (<150 palabras cada uno)
   - **Skills/Agents a auditar** — tabla con nombre, razón, acción contra los 10 Commandments
   - **Comparación mensual** — tabla mes actual vs anterior (coste, sesiones, archivos, errores)
   - **Próximas acciones** — 3-5 bullets priorizados (alta/media/baja)

4. Después de que el builder complete, re-ejecuta `bun .claude/scripts/usage-snapshot.ts` para embeber el nuevo `insights.md` en `dashboard.html`.

5. Informa al usuario: `open .claude/data/usage/dashboard.html` para ver el dashboard actualizado con narrativa IA.

El análisis debe ser específico, con números reales de los datos, no genérico. Si la ventana de datos tiene menos de 7 días, advierte que las conclusiones tienen baja confianza.

---
description: Muestra el dashboard de confianza de agentes
---

Lee el archivo `~/.claude/agent-trust.jsonl`.

Cada linea es un JSON con formato:
```json
{"agent":"builder","taskType":"implementation","level":2,"score":85,"consecutiveSuccesses":12,"consecutiveFailures":0,"totalSessions":45,"criticalFailuresInLast50":0,"lastActivity":"2026-03-15T10:00:00Z","history":[]}
```

Instrucciones:
1. Usa `Glob` para verificar que `~/.claude/agent-trust.jsonl` existe
2. Si no existe o esta vacio, muestra: "No trust data yet. Trust is built over multiple sessions."
3. Lee y parsea cada linea como JSON
4. Muestra una tabla ordenada por nivel de confianza (mayor primero):

## Agent Trust Levels

| Agent | Task Type | Level | Score | Streak | Total Sessions | Last Updated |
|-------|-----------|-------|-------|--------|----------------|--------------|

5. Niveles de confianza:
   - Level 0: Probation (full oversight)
   - Level 1: Supervised (mandatory reviewer)
   - Level 2: Autonomous (spot-check only)
   - Level 3: Trusted (minimal oversight)

6. Formatear Level como: `0 (probation)`, `1 (supervised)`, `2 (autonomous)`, `3 (trusted)`
7. Streak muestra: `N successes` o `N failures` segun consecutiveSuccesses/consecutiveFailures
8. Last Updated formateado como fecha corta (YYYY-MM-DD)

9. Despues de la tabla, mostrar leyenda:

### Trust Level Descriptions

| Level | Name | Oversight |
|-------|------|-----------|
| 0 | Probation | Full oversight: worktree + reviewer + user confirmation |
| 1 | Supervised | Mandatory reviewer on all changes |
| 2 | Autonomous | Spot-check only (20% of sessions) |
| 3 | Trusted | Minimal oversight, light validation |

10. Si hay historial de eventos (promotions/demotions), mostrar las ultimas 5:

### Recent Trust Events

| Agent | Action | From | To | Reason | Date |
|-------|--------|------|----|--------|------|

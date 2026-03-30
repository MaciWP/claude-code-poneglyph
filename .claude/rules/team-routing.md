# Team Routing Rule

Quick reference para el Lead cuando ejecuta team mode. Ver `complexity-routing.md` para criterios de decision.

## Prerequisitos

| Requisito | Check |
|-----------|-------|
| Env var activa | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| Planner recomendo team | `executionMode: team` en roadmap |
| Complejidad > 60 | Calculada en complexity routing |
| 3+ dominios independientes | Sin archivos compartidos entre dominios |

Si cualquier prerequisito falla → usar subagents (flujo actual).

## Opt-Out

| Variable | Efecto |
|----------|--------|
| `PONEGLYPH_DISABLE_TEAM_MODE=1` | Fuerza subagents siempre, ignora recomendacion del planner |

## Teammate Prompt Template

Cada teammate recibe un prompt con:

| Campo | Contenido |
|-------|-----------|
| **Dominio** | "Tu dominio es [X]. Solo tocas archivos en [paths]." |
| **Tareas** | Subtasks del roadmap asignadas a este dominio |
| **Interfaces** | Contratos a exponer/consumir con otros dominios |
| **Restriccion** | "NO modifiques archivos fuera de tu dominio" |
| **Coordinacion** | "Usa task list para coordinar con otros teammates" |

## Protocolo de Coordinacion

| Fase | Accion del Lead |
|------|-----------------|
| **Spawn** | Crear un teammate por dominio con prompt template |
| **Monitor** | Revisar task list para progreso. No intervenir salvo stuck. |
| **Interfaces** | Teammates negocian contratos via task list (TaskCreate/TaskUpdate) |
| **Integracion** | Tras completar todos los teammates, Lead ejecuta reviewer sobre changeset completo |
| **Cleanup** | Verificar que no hay conflictos de archivos entre outputs de teammates |

## Fallback a Subagents

| Trigger | Accion |
|---------|--------|
| Teammate falla 2x | Extraer tareas del dominio → ejecutar como builder subagent |
| Multiples teammates fallan | Abortar team mode → fallback a subagents completo |
| Conflicto de archivos entre teammates | Lead arbitra via reviewer. Dominio perdedor re-ejecuta. |
| Env var ausente pero planner recomendo team | Fallback silencioso a subagents. Log warning. |

## Coste Comparativo

| Modo | Coste relativo | Cuando vale la pena |
|------|---------------|---------------------|
| Subagents | 1x (baseline) | 95% de las tareas |
| Team Agents | 3-7x | Dominios verdaderamente independientes, complexity >60, necesidad de negociacion de interfaces |

## Limitacion Actual

Teammates son siempre `general-purpose` (issue anthropics/claude-code#24316). No pueden usar `.claude/agents/` custom. Pero cada teammate carga `~/.claude/` automaticamente — reglas, skills y hooks de Poneglyph aplican.

---
globs:
  - ".claude/agents/**"
  - ".claude/rules/**"
  - ".claude/skills/**"
priority: 15
---

## Orchestration Context

Archivos del sistema de orquestacion Poneglyph. Mantener consistencia entre agentes, skills y reglas.

- Seguir formato frontmatter YAML estandar
- Mantener keywords actualizados para auto-matching
- Documentar dependencias entre componentes
- Verificar que cambios no rompen el grafo de orquestacion

### Agent Frontmatter — campos clave recientes

| Campo | Nota |
|-------|------|
| `effort` | Fijo por agente. NO variable per-invocacion. Solo definir si invariable |
| `maxTurns` | Safety net. Devuelve `error_max_turns` al Lead |
| `memory` | Scope: `user`, `project`, `local` |
| `isolation` | `worktree` para git worktree aislado |
| `initialPrompt` | Auto-submit al iniciar agente |

### Skill Frontmatter — campos clave recientes

| Campo | Nota |
|-------|------|
| `effort` | Override effort al invocar skill |
| `paths` | YAML list de globs — skill solo aplica a estos paths |
| `context` | `fork` = contexto aislado |

### Error Recovery — SendMessage

Preferir `SendMessage({to: agentId})` para continuar agente fallido en vez de re-spawnar. Preserva contexto y ahorra tokens.

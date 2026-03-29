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

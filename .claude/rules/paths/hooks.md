---
globs:
  - ".claude/hooks/**"
priority: 15
skills:
  - typescript-patterns
  - bun-best-practices
---

## Hooks Context

Hooks de Claude Code (pre/post/stop). Codigo TypeScript ejecutado por Bun runtime.

- Siempre exit 0 para hooks best-effort (Stop hooks)
- Usar EXIT_CODES de validators/config.ts
- Leer stdin con readStdin() de config.ts
- Manejar errores gracefully — nunca bloquear Claude Code
- Testear con bun:test

---
globs:
  - ".claude/hooks/**"
priority: 15
---

## Hooks Context

Scripts de validacion ejecutados por Claude Code en puntos especificos del workflow. El runtime y lenguaje dependen del proyecto.

- Siempre exit 0 para hooks best-effort (Stop hooks)
- Usar EXIT_CODES de validators/config (si existe)
- Leer stdin con readStdin() de config (si existe)
- Manejar errores gracefully — nunca bloquear Claude Code
- Testear con el test runner del proyecto

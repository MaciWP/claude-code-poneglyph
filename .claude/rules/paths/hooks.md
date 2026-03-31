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

### Gotcha: Shebangs en Windows / PATH reducido

Claude Code ejecuta hooks con un PATH reducido. **NUNCA usar `#!/usr/bin/env bash`** — `env` no se encuentra.

| Shebang | Funciona | Alternativa |
|---------|----------|-------------|
| `#!/usr/bin/env bash` | NO | `#!/bin/bash` (ruta absoluta) |
| `#!/usr/bin/env bun` | SI | Poneglyph incluye bun en PATH via settings.json |
| `#!/bin/bash` | SI | Ruta absoluta, no depende de env |

**Preferir `.ts` con bun** sobre `.sh` para hooks. Si se necesita `.sh`, usar `#!/bin/bash`.

### Hook Events Disponibles

| Event | Cuando | Uso en Poneglyph |
|-------|--------|-------------------|
| PreToolUse | Antes de tool | lead-enforcement, check-staleness |
| PostToolUse | Despues de tool | format-code, validators, context |
| Stop | Fin de turno | trace-logger, validate-tests, session-digest |
| SubagentStop | Fin de subagente | agent-scoring |
| StopFailure | Error API (rate limit, auth) | api-error-recorder |
| PermissionRequest | Claude pide permiso | auto-approve |
| PostCompact | Tras compactar | post-compact |
| UserPromptSubmit | Al enviar prompt | memory-inject |

### Campo `if` para filtrado condicional

Ademas de `matcher`, `if` filtra con permission rule syntax para no spawnar proceso innecesariamente:
```json
{"matcher": "Edit|Write", "if": "Edit(*.ts)|Write(*.ts)"}
```

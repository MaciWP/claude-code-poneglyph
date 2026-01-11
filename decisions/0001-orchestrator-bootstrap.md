# ADR 0001: Orchestrator Bootstrap

**Fecha**: 2026-01-11
**Estado**: Aceptado
**Decisores**: Usuario + Claude Code

## Contexto

El repositorio `claude-code-poneglyph` necesitaba una capa de orquestación para que Claude Code pueda actuar como un orquestador profesional, delegando tareas a agentes especializados y manteniendo calidad de código.

Se evaluó un plan original de 8 secciones con 12+ archivos de documentación propuestos.

## Decisión

Se decidió implementar un **plan optimizado** con las siguientes características:

### 1. Reducción de Documentación

- **Original**: 12+ archivos de documentación
- **Optimizado**: 6-8 archivos esenciales
- **Razón**: Evitar duplicación con infraestructura existente en `.claude/`

### 2. Reutilización de Infraestructura Existente

| Ya Existía | Acción |
|------------|--------|
| 14 agents en `.claude/agents/` | Reutilizar, no duplicar |
| 8 skills en `.claude/skills/` | Reutilizar |
| 11 commands en `.claude/commands/` | Reutilizar |
| 5 MCP servers | Reutilizar |

### 3. Fases Incrementales

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | Documentación base | ✅ Completada |
| 2 | Quality gates (ESLint, Prettier, scripts) | ✅ Completada |
| 3 | Git & CI (GitHub Actions, husky) | ✅ Completada |
| 4 | Operativo (backlog, mejoras) | Pendiente |

### 4. Archivos NO Creados (duplicación evitada)

- `docs/orchestrator/COMMANDS.md` - Ya existe `.claude/commands/`
- `docs/orchestrator/AGENTS.md` - Ya existe `.claude/agents/`
- `reports/REPO_BASELINE.md` - Ya existe `.claude/agent_docs/architecture.md`
- `reports/BUGS_AND_SMELLS.md` - Usar agent `bug-documenter`

## Consecuencias

### Positivas

- Menos archivos que mantener
- Integración con infraestructura existente
- Cambios incrementales y reversibles
- Quality gates configurados desde el inicio

### Negativas

- Algunos errores de código existente no arreglados (56 TypeScript, 6 ESLint)
- CI con `continue-on-error` temporalmente

### Riesgos Mitigados

- Documentación desincronizada → Reducida al mínimo
- Cambios masivos → Fases incrementales
- Git no inicializado → Resuelto en Fase 3

## Archivos Creados

### Fase 1 (Documentación)
- `docs/orchestrator/CAPABILITIES.md`
- `docs/orchestrator/ORCHESTRATOR.md`
- `reports/QUALITY_GATES.md`
- `CONTRIBUTING.md`

### Fase 2 (Quality Gates)
- `web/eslint.config.js`
- `web/.prettierrc`
- `scripts/check.sh`
- `scripts/lint.sh`
- `scripts/test.sh`
- `scripts/typecheck.sh`

### Fase 3 (Git & CI)
- `.github/workflows/ci.yml`
- `decisions/0001-orchestrator-bootstrap.md` (este archivo)

## Referencias

- Plan original: Prompt de bootstrap del usuario
- Plan optimizado: `orchestrator_plan.md`
- Estado de quality: `reports/QUALITY_GATES.md`

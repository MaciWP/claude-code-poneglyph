# Claude Code Poneglyph

UI wrapper para Claude Code | Bun + Elysia + React

## WHAT

Plataforma para ejecutar Claude Code con UI web, soporte SDK y CLI spawn.

## WHY

| Problema | Solución |
|----------|----------|
| CLI sin UI | Web interface con streaming |
| Sin memoria persistente | Sistema de memoria semántica |
| Sin orquestación | Multi-agente con especialización |

## HOW

```mermaid
graph LR
    User --> Web
    Web --> Elysia
    Elysia --> Claude[Claude Code]
    Claude --> Response
```

## Commands

```bash
bun dev:server  # Backend :8080
bun dev:web     # Frontend :5173
```

## API

| Endpoint | Descripción |
|----------|-------------|
| POST `/api/execute` | SDK mode |
| POST `/api/execute-cli` | CLI spawn |
| WS `/ws` | Streaming |
| GET `/api/sessions` | Listar sesiones |

## Anti-Hallucination

1. `Glob` antes de afirmar existencia de archivo
2. `LSP/Grep` antes de afirmar existencia de función
3. `Read` antes de `Edit`
4. Preguntar si confidence < 70%

## Tool Hierarchy

LSP (primario) > Grep (fallback) > Glob (archivos)

## Deep Dive

Documentación detallada en `.claude/agent_docs/`:
- `architecture.md` - Arquitectura completa
- `api-reference.md` - Todos los endpoints
- `patterns.md` - Patrones del proyecto
- `troubleshooting.md` - Errores comunes

## Extended Context

| Comando | Contenido |
|---------|-----------|
| `/load-reference` | API, arquitectura, tools |
| `/load-security` | Patrones de seguridad |
| `/load-testing-strategy` | Testing |

## Lead Orchestrator Mode

Esta sesión actúa como **orquestador puro**. NO ejecuta código directamente.

### Herramientas Permitidas

| Tool | Uso |
|------|-----|
| `Task` | Delegar a agentes (builder, reviewer, planner, error-analyzer, scout) |
| `Skill` | Cargar skills para contexto |
| `AskUserQuestion` | Clarificar requisitos |
| `TaskList/Create/Update` | Gestionar lista de tareas |

### Herramientas PROHIBIDAS

| Tool | Alternativa |
|------|-------------|
| `Read` | Delegar a scout o builder |
| `Edit` | Delegar a builder |
| `Write` | Delegar a builder |
| `Bash` | Delegar a builder |
| `Glob` | Delegar a scout/Explore |
| `Grep` | Delegar a scout/Explore |
| `WebFetch/WebSearch` | Los agentes tienen acceso |

### Flujo Obligatorio

```mermaid
graph TD
    U[Usuario] --> S[Score Prompt]
    S -->|< 70| PE[prompt-engineer skill]
    S -->|>= 70| C[Calcular Complejidad]
    C -->|< 30| B[builder directo]
    C -->|30-60| P1[planner opcional]
    C -->|> 60| P2[planner obligatorio]
    P1 & P2 --> B[builder]
    B --> R[reviewer checkpoint]
    R -->|APPROVED| D[Done]
    R -->|NEEDS_CHANGES| B
    B -->|Error| EA[error-analyzer]
    EA --> B
```

### Reglas Clave

1. **Evaluar prompt** con scoring de 5 criterios (ver `.claude/rules/prompt-scoring.md`)
2. **Calcular complejidad** antes de delegar (ver `.claude/rules/complexity-routing.md`)
3. **Cargar skills relevantes** por keywords (ver `.claude/rules/skill-matching.md`)
4. **Delegar implementación** a builder, NUNCA implementar directamente
5. **Validar con reviewer** en checkpoints críticos
6. **Analizar errores** con error-analyzer si falla

# AGENTS.md

Guia operativa para agentes que trabajen en este repo. Objetivo: mantener paridad o mejor comportamiento que Claude Code, respetando el stack y las practicas del proyecto.

## Contexto del proyecto

UI wrapper para Claude Code con observabilidad y orquestacion. Permite ejecutar Claude via SDK o via CLI spawn, con streaming por WebSocket y persistencia de sesiones.

## Stack y runtime

- Runtime: Bun 1.x
- Backend: Elysia (HTTP + WebSocket)
- Frontend: React 18 + Vite + TailwindCSS
- SDK: @anthropic-ai/claude-agent-sdk
- CLI: child_process.spawn("claude", [...])

## Modos de ejecucion

| Modo | Implementacion | Uso |
|------|----------------|-----|
| SDK | query() de @anthropic-ai/claude-agent-sdk | Headless, produccion, sin terminal |
| CLI Spawn | spawn("claude", ["-p", prompt]) | Interactivo, comandos, skills, agentes |

Regla: preferir CLI Spawn cuando se requiera la experiencia completa de Claude Code (comandos, skills, agentes). Usar SDK para tareas automatizadas y paralelas.

## Arquitectura

Frontend (React :5173) -> Backend (Elysia :8080) -> Claude Code (SDK/Spawn)
                                                -> Session Store (JSON)

## Estructura del repo (alto nivel)

claude-code-ui/
  server/     Backend Bun/Elysia
  web/        Frontend React/Vite
.claude/      Configuracion de Claude Code (agents, skills, rules)

## Comandos clave de desarrollo

Backend:
  cd claude-code-ui/server
  bun install
  bun run dev       # :8080

Frontend:
  cd claude-code-ui/web
  bun install
  bun run dev       # :5173

Produccion:
  cd claude-code-ui/web && bun run build
  cd claude-code-ui/server && bun run start

## API endpoints

- GET /api/health
- GET /api/sessions
- POST /api/sessions
- POST /api/execute        (SDK)
- POST /api/execute-cli    (CLI spawn)
- WS  /ws                  (streaming)

## Estilo y convenciones

- Type hints en todas las funciones.
- Preferir async/await.
- Imports a nivel de fichero (no inline).
- Comentarios minimos; solo si aclaran algo no obvio.
- ESLint + Prettier.

## Validacion y seguridad (anti-hallucination)

- Validar archivos con glob/rg antes de afirmar que existen.
- Leer el archivo antes de editarlo.
- Validar funciones con rg antes de afirmar que existen.
- Si la confianza es baja o hay duda de ubicacion, preguntar o verificar.

## Cross-platform

El modo CLI Spawn usa shell: true para compatibilidad Windows/Mac. Respetar esa decision.

## Expectativas para agentes

- Mantener la paridad de funcionalidades entre SDK y CLI.
- Respetar rutas y nombres existentes; no inventar endpoints.
- No romper la compatibilidad de streaming (WS).
- Preferir cambios incrementales y probar localmente cuando sea posible.

## Indice de skills de agentes (Codex)

Estas skills viven en `.codex/skills/` y reflejan los agentes de `.claude/agents/`.

- agent-architect: planificacion y diseno tecnico.
- agent-bug-documenter: documentacion de bugs en AI_BUGS_KNOWLEDGE.md.
- agent-builder: implementacion segun plan.
- agent-code-quality: auditoria de calidad y olores de codigo.
- agent-refactor: refactorizacion sin cambiar comportamiento.
- agent-reviewer: code review (solo lectura).
- agent-scout: exploracion read-only y descubrimiento.
- agent-task-decomposer: descomposicion de tareas y dependencias.

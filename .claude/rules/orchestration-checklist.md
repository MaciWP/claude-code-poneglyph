# Orchestration Pre-Action Protocol (MANDATORY)

Antes de responder a CUALQUIER prompt del usuario, ejecutar pasos 1-5 EN ORDEN. NO saltar.

**Apply when**: Siempre. Cada prompt. Sin excepciones.

## Paso 1: Triage

| Condicion | Accion |
|-----------|--------|
| Tarea trivial (typo, rename, 1 linea, pregunta simple) | Skip a Paso 4 |
| Prompt vago (score < 70) | Cargar skill `prompt-engineer`, clarificar |
| Prompt claro (score >= 70) | Continuar a Paso 2 |

## Paso 2: Complejidad

Calcular score y mostrar inline: `Complejidad: ~XX`

| Score | Routing |
|-------|---------|
| < 15 | builder directo, skip scoring/skills |
| 15-30 | builder directo |
| 30-60 | planner opcional |
| > 60 | planner OBLIGATORIO |

Factores: Archivos, Dominios, Dependencias, Seguridad, Integraciones (ver `complexity-routing.md`).

## Paso 3: Preparar contexto

1. Extraer keywords del prompt
2. Consultar `skill-matching.md` del proyecto (si existe) o global
3. Cargar max 3 skills via `Skill()` ANTES de delegar
4. Verificar si hay agente especializado (ej: `django-refactor-agent`, `django-security-auditor`)

## Paso 4: Delegar

| Herramienta | Uso |
|-------------|-----|
| `Agent(subagent_type="builder")` | Implementar codigo |
| `Agent(subagent_type="scout")` | Explorar codebase |
| `Agent(subagent_type="planner")` | Planificar tareas complejas |
| `Agent(subagent_type="reviewer")` | Validar cambios |
| `Skill()` | Cargar contexto de dominio |

**PROHIBIDO usar directamente**: Read, Edit, Write, Bash, Glob, Grep.
**Excepciones**: CLAUDE.md, memory/, .claude/, conftest.py, plan files.
**Paralelizar**: Agents independientes en el MISMO mensaje.

## Paso 5: Validar

| Tipo de cambio | Validacion |
|----------------|-----------|
| Single file, low complexity | Builder confirma tests passing |
| Multi-file | Delegar a reviewer |
| Security-related | security-auditor |
| Cross-domain | reviewer + test-watcher |

**NUNCA reportar "completado" sin confirmacion de tests passing.**

## Cuando NO aplicar este protocolo

- Responder preguntas sin codigo (explicaciones, decisiones)
- Leer CLAUDE.md o memory para orientacion
- Cargar skills via Skill tool
- Escribir/actualizar plan files o memory

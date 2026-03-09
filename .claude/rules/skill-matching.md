# Skill Auto-Matching Rule

Antes de delegar a builder/reviewer, detectar keywords y cargar skills relevantes.

## Tabla de Keywords → Skills

| Keywords en Prompt | Skill a Cargar |
|--------------------|----------------|
| auth, jwt, password, security, token, session | `security-review` |
| database, sql, drizzle, migration, query, orm, transaction | `database-patterns` |
| test, mock, tdd, coverage, unit, integration, fixture | `testing-strategy` |
| api, endpoint, route, rest, openapi, swagger, pagination | `api-design` |
| typescript, async, promise, generic, interface | `typescript-patterns` |
| websocket, realtime, ws, streaming, socket | `websocket-patterns` |
| refactor, extract, SOLID, clean, simplify | `refactoring-patterns` |
| log, logging, trace, debug, observability | `logging-strategy` |
| error, retry, circuit, fallback, recovery | `retry-patterns` |
| config, env, validation, settings | `config-validator` |
| best practice, pattern, expert, compare, industry standard, owasp, clean code, architecture, design pattern | `expert-patterns` |
| bun, runtime, elysia, spawn, shell | `bun-best-practices` |
| diagnose, investigate, trace, stacktrace, 5 whys, root cause | `diagnostic-patterns` |
| performance, memory, optimization, bottleneck, slow, profiling, n+1 | `performance-review` |
| definition, references, hover, symbols, implementation, calls, lsp | `lsp-operations` |
| code quality, code smells, SOLID, complexity, duplication, clean code | `code-quality` |
| validate, verify, check, exists, hallucination, confidence, claim | `anti-hallucination` |

## Proceso de Matching

1. **Extraer keywords** del prompt del usuario (lowercase, stemming basico)
2. **Matchear** contra tabla (partial match valido)
3. **Cargar skills** matcheadas (maximo 3 por relevancia)
4. **Pasar contexto** de skills al agente delegado

## Task Type Detection

Detectar tipo de tarea por verbos en el prompt para sugerir skills adicionales.

| Tipo de Tarea | Verbos Trigger | Skills Preferidas |
|---------------|----------------|-------------------|
| Creacion | crear, implementar, añadir, nuevo | `typescript-patterns`, `api-design` |
| Debugging | debuggear, investigar, fix, arreglar | `diagnostic-patterns`, `retry-patterns` |
| Refactoring | refactorizar, extraer, simplificar, limpiar | `refactoring-patterns`, `code-quality` |
| Testing | testear, probar, coverage, TDD | `testing-strategy`, `bun-best-practices` |
| Review | revisar, auditar, validar, verificar | `code-quality`, `security-review` |
| Optimizacion | optimizar, performance, acelerar | `performance-review`, `expert-patterns` |
| Seguridad | securizar, auth, proteger, hardening | `security-review`, `anti-hallucination` |
| Documentacion | documentar, explicar, describir | `expert-patterns` |

## Skill Composition

### Reglas de Sinergia

Pares de skills que se refuerzan mutuamente (boost +1 prioridad cuando ambas aplican):

| Skill A | Skill B | Sinergia |
|---------|---------|----------|
| `api-design` | `security-review` | Auth endpoints |
| `api-design` | `database-patterns` | CRUD endpoints |
| `testing-strategy` | `bun-best-practices` | Bun test patterns |
| `typescript-patterns` | `refactoring-patterns` | Type-safe refactoring |
| `security-review` | `anti-hallucination` | Validacion segura |
| `diagnostic-patterns` | `retry-patterns` | Error investigation |
| `logging-strategy` | `diagnostic-patterns` | Observability |
| `database-patterns` | `config-validator` | DB config |
| `performance-review` | `database-patterns` | Query optimization |
| `code-quality` | `refactoring-patterns` | Clean code |
| `expert-patterns` | `api-design` | API best practices |
| `websocket-patterns` | `typescript-patterns` | Type-safe WS |
| `testing-strategy` | `code-quality` | Quality assurance |

### Reglas de Conflicto

Pares de skills que NO deben cargarse juntas (la de menor score se descarta):

| Skill A | Skill B | Razon |
|---------|---------|-------|
| `expert-patterns` | `code-quality` | Overlap en recomendaciones |
| `expert-patterns` | `refactoring-patterns` | Overlap en patrones |

### Priority Scoring

```
score = +2 per keyword match
       + 2 per path rule match
       + 1 per task-type match
       + 1 per synergy partner in set
       - 3 if in conflict with higher-scored skill
```

## Ejemplo

Prompt: "Implementar endpoint de login con JWT y validacion de password"

Keywords detectados: `endpoint`, `login`, `jwt`, `password`, `validacion`

Skills matcheadas:
1. `api-design` (endpoint)
2. `security-review` (jwt, password)

Instruccion al builder:

```
Cargar skills: api-design, security-review
Contexto: Endpoint de login requiere patrones REST y seguridad JWT
```

## Priorizacion

Si hay mas de 3 matches:
1. Priorizar por frecuencia de keywords
2. Priorizar skills del dominio principal
3. Descartar skills genericas si hay especificas

## Integracion con Agentes

| Agente | Base Skills (gratis) | Max Adicionales | Total Max |
|--------|---------------------|-----------------|-----------|
| builder | — | 5 | 5 |
| reviewer | code-quality, testing-strategy, anti-hallucination | 2 | 5 |
| architect | — | 4 | 4 |
| error-analyzer | retry-patterns | 2 | 3 |
| planner | — | 2 | 2 |
| scout | — | 1 | 1 |
| security-auditor | security-review | 2 | 3 |

## Skills Sin Keywords

Las siguientes 7 skills NO estan en la tabla de keywords — se cargan por otros mecanismos:

| Skill | Mecanismo de Carga |
|-------|-------------------|
| `code-style-enforcer` | Frontmatter del builder |
| `recovery-strategies` | Base skill de error-analyzer |
| `meta-create-agent` | Solo via comando `/meta-create-agent` |
| `meta-create-skill` | Solo via comando `/meta-create-skill` |
| `prompt-engineer` | Cargada por Lead cuando prompt score <70 |
| `sync-claude` | Solo via comando `/sync-claude` |
| `playwright-browser` | Solo via comando o keyword "browser" |

## Agent Skill Enrichment

Cuando el Lead delega a un agent, DEBE:

1. Verificar las skills del agent (frontmatter `skills:`)
2. Si la tarea requiere skills adicionales, mencionarlas en el prompt del Task
3. El agent tiene acceso a sus skills frontmatter automaticamente

| Metodo | Cuando | Ejemplo |
|--------|--------|---------|
| Frontmatter `skills:` | Siempre auto-cargadas | builder tiene typescript-patterns |
| Mencion en prompt | Skill no esta en frontmatter pero es relevante | "Aplica patrones de database-patterns" |
| Lead carga Skill() | Contexto complejo que el agent necesita | `Skill("security-review")` antes de Task |

### Principio de Modularidad

Cualquier agent puede beneficiarse de cualquier skill. Las skills frontmatter son las **default**, pero el Lead puede enriquecer via prompt. Esto permite:
- Un reviewer usando testing-strategy para validar tests
- Un builder usando security-review para codigo con auth
- Un scout usando lsp-operations para navegacion semantica

## Path-Based Rule Integration

Las path rules en `.claude/rules/paths/*.md` proporcionan skills basadas en la ubicacion del archivo.

### Flujo Combinado

1. Extraer keywords del prompt → matchear tabla de keywords
2. Extraer file paths del prompt → matchear path rules
3. Detectar task type por verbos → sugerir skills adicionales
4. Unir todas las skills, deduplicar, aplicar synergy/conflict
5. Truncar al limite del agente

### Path Rules como Segunda Señal

Las path rules actuan como **segunda señal** complementaria a keywords:

| Señal | Fuente | Ejemplo |
|-------|--------|---------|
| Keyword | Texto del prompt | "implementar endpoint" → `api-design` |
| Path | Archivo mencionado | `src/routes/users.ts` → `api-design` |
| Task type | Verbo del prompt | "refactorizar" → `refactoring-patterns` |

Cuando keyword + path coinciden en la misma skill, esa skill recibe **doble confirmacion** (+2 priority score cada señal).

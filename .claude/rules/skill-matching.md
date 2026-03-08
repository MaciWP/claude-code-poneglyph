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

## Proceso de Matching

1. **Extraer keywords** del prompt del usuario (lowercase, stemming basico)
2. **Matchear** contra tabla (partial match valido)
3. **Cargar skills** matcheadas (maximo 3 por relevancia)
4. **Pasar contexto** de skills al agente delegado

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

| Agente | Skills Auto-Cargadas |
|--------|----------------------|
| builder | Todas las matcheadas (max 3) |
| reviewer | code-quality + matcheadas (max 2) |
| architect | api-design + security-review si aplica |
| error-analyzer | retry-patterns + recovery-strategies |

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

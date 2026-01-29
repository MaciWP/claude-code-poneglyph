# Skill Auto-Matching Rule

Antes de delegar a builder/reviewer, detectar keywords y cargar skills relevantes.

## Tabla de Keywords → Skills

| Keywords en Prompt | Skill a Cargar |
|--------------------|----------------|
| auth, jwt, password, security, token, session | `security-coding` |
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
2. `security-coding` (jwt, password)

Instruccion al builder:

```
Cargar skills: api-design, security-coding
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
| architect | api-design + security-coding si aplica |
| error-analyzer | retry-patterns + recovery-strategies |

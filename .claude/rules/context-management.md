# Context Management

Reglas para carga de skills y contexto a agentes. Evitar sobrecarga de contexto irrelevante.

## Skill Loading Limits

| Agent | Base Skills (gratis) | Max Adicionales | Total Max | Notes |
|-------|---------------------|-----------------|-----------|-------|
| builder | — | 5 | 5 | Frontmatter consume slots del max |
| reviewer | code-quality, testing-strategy, anti-hallucination | 2 | 5 | Base son gratis |
| error-analyzer | retry-patterns | 2 | 3 | + matched skills |
| architect | — | 4 | 4 | + api-design, expert-patterns |
| planner | — | 2 | 2 | High-level only |
| scout | — | 1 | 1 | Minimal context |
| security-auditor | security-review | 2 | 3 | + matched skills |

## Precedence Rules

1. **Domain-specific skills > generic skills** — siempre priorizar especificas
2. **Base skills no cuentan** contra el limite max del agente
3. **Si keyword matches > agent max**: priorizar por frecuencia de keywords en el prompt
4. **Si empate**: preferir skills del dominio principal de la tarea

## Composition Rules

Cuando multiples skills aplican, respetar sinergia y conflictos:

1. **Sinergia**: Si dos skills matcheadas son par sinergico (ver `skill-matching.md`), ambas reciben +1 prioridad
2. **Conflicto**: Si dos skills son par conflictivo, descartar la de menor score
3. **Budget overflow**: Si matches > max del agente, ordenar por score y truncar
4. **Base skills**: NO cuentan contra el limite max (son gratis)
5. **Frontmatter skills**: SI cuentan contra el limite max del agente

## Context Loading Methods

| Method | When | Example |
|--------|------|---------|
| Skill (via Skill tool) | Domain patterns, best practices | `api-design`, `security-review` |
| Scout agent | Codebase exploration, finding files | "Find all auth-related files" |
| Explore agent | Deep codebase analysis | "How does the auth system work?" |

## Anti-Patterns

| Anti-Pattern | Problema | Alternativa |
|--------------|----------|-------------|
| Loading >5 skills para un builder | Context overload, respuestas diluidas | Priorizar top 5 por relevancia |
| Loading generic skills cuando hay especificas | Ruido innecesario | Domain-specific primero |
| Usar scout cuando ya conoces los paths | Desperdicio de tokens/tiempo | Read directo o delegar builder |
| Cargar skills sin keyword match | Contexto irrelevante | Solo cargar si keywords matchean |
| Repetir base skills en el conteo | Limita skills utiles | Base skills son gratis |

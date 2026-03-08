# Context Management

Reglas para carga de skills y contexto a agentes. Evitar sobrecarga de contexto irrelevante.

## Skill Loading Limits

| Agent | Max Skills | Base Skills (no cuentan) | Notes |
|-------|-----------|--------------------------|-------|
| builder | 5 | - | 3 core + 2 domain-specific |
| reviewer | 4 | code-quality, testing-strategy, anti-hallucination (always loaded) | + 2 matched skills |
| error-analyzer | 2 | retry-patterns (always loaded) | + matched skills |
| architect | 4 | - | + api-design, expert-patterns |
| planner | 2 | - | High-level only |

## Precedence Rules

1. **Domain-specific skills > generic skills** — siempre priorizar especificas
2. **Base skills no cuentan** contra el limite max del agente
3. **Si keyword matches > agent max**: priorizar por frecuencia de keywords en el prompt
4. **Si empate**: preferir skills del dominio principal de la tarea

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

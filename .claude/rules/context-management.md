# Context Management

Reglas para carga de skills y contexto a agentes. Evitar sobrecarga de contexto irrelevante.

## Skill Loading Limits

| Agent | Base Skills (gratis) | Max Adicionales | Total Max | Notes |
|-------|---------------------|-----------------|-----------|-------|
| builder | anti-hallucination | 5 | 6 | Base gratis, no cuenta contra max |
| reviewer | code-quality, security-review, performance-review, anti-hallucination | 2 | 6 | Base son gratis |
| error-analyzer | diagnostic-patterns | 2 | 3 | + matched skills |
| architect | — | 4 | 4 | |
| planner | — | 2 | 2 | High-level only |
| scout | — | 1 | 1 | Minimal context |
| command-loader | — | 0 | 0 | Infrastructure only |

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
| Skill (via Skill tool) | Domain patterns, best practices | `security-review` |
| Scout agent | Codebase exploration, finding files | "Find all auth-related files" |
| Explore agent | Deep codebase analysis | "How does the auth system work?" |

## Agent Expertise (No Cuenta Contra Skill Limits)

Cada agente tiene un archivo de expertise persistente en `.claude/agent-memory/{agent}/EXPERTISE.md`.

| Aspecto | Detalle |
|---------|---------|
| Carga | Lead inyecta al delegar (ultimos 3K tokens) |
| Coste contra limits | **NO cuenta** contra skill limits del agente |
| Actualizacion | Automatica via SubagentStop hook |
| Max size | 5K tokens (~20K chars) con pruning FIFO |

### Expertise vs Skills vs Memory

| Tipo | Quien lo mantiene | Contenido | Persistencia |
|------|-------------------|-----------|-------------|
| Skills | Desarrollador (manual) | Patrones y best practices genericos | Estatico |
| Expertise | Hook automatico | Insights del agente sobre el codebase | Crece por sesion |
| Memory | Usuario | Preferencias, feedback, contexto proyecto | Manual |
| Patterns | Hook automatico | Secuencias agente→agente exitosas | Crece por sesion |

## Anti-Patterns

| Anti-Pattern | Problema | Alternativa |
|--------------|----------|-------------|
| Loading >5 skills para un builder | Context overload, respuestas diluidas | Priorizar top 5 por relevancia |
| Loading generic skills cuando hay especificas | Ruido innecesario | Domain-specific primero |
| Usar scout cuando ya conoces los paths | Desperdicio de tokens/tiempo | Read directo o delegar builder |
| Cargar skills sin keyword match | Contexto irrelevante | Solo cargar si keywords matchean |
| Repetir base skills en el conteo | Limita skills utiles | Base skills son gratis |

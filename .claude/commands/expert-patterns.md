---
description: Analiza codigo comparandolo con best practices de expertos
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch
---

# /expert-patterns

Analiza un archivo o patron comparandolo con best practices de documentacion oficial, blogs de expertos y repos exitosos.

## Uso

```
/expert-patterns <file-path> [category]
/expert-patterns src/services/auth.ts security
/expert-patterns src/routes/api.ts api
/expert-patterns . typescript
```

## Categorias

| Categoria | Keywords | Fuentes Prioritarias |
|-----------|----------|---------------------|
| security | auth, validation, crypto | OWASP, security-coding |
| api | routes, endpoints, REST | Elysia docs, api-design |
| react | components, hooks, state | React docs, Kent C. Dodds |
| typescript | types, generics, patterns | TS handbook, Matt Pocock |
| bun | runtime, file, shell | Bun docs |
| testing | test, mock, coverage | Testing Trophy |

## Proceso

### 1. Cargar Knowledge Base

```
Read .claude/skills/expert-patterns/knowledge-base/[category]-patterns.md
```

### 2. Analizar Codigo Actual

```
Read $ARGUMENTS (el archivo a analizar)
```

Identificar:
- Patrones usados
- Anti-patrones potenciales
- Gaps con best practices

### 3. Consultar Fuentes Dinamicas (opcional)

Si el knowledge base no cubre el caso:

```
WebSearch "[pattern] best practice [framework] 2024"
WebFetch [url de docs oficiales]
```

### 4. Generar Comparacion

| Aspecto | Codigo Actual | Best Practice | Gap |
|---------|---------------|---------------|-----|
| [aspecto] | [actual] | [recomendado] | [diferencia] |

### 5. Producir Recomendaciones

```markdown
## Recommendations

### High Priority
1. [recomendacion con ejemplo de codigo]

### Medium Priority
1. [recomendacion]

### Sources
- [Official Doc](url)
- [Expert Blog](url)
- [Successful Repo](url)
```

## Output Esperado

```markdown
## Expert Pattern Analysis: [file]

### Summary
- **Category**: [category]
- **Patterns Found**: [n]
- **Issues Detected**: [n]
- **Confidence**: [0-100]%

### Current Patterns
| Pattern | Status | Line | Notes |
|---------|--------|------|-------|

### Best Practices Comparison
[tabla comparativa]

### Recommendations
[lista priorizada]

### Sources Consulted
- [x] Static knowledge base
- [ ] Official docs (if fetched)
- [ ] Expert blogs (if searched)
```

## Ejemplos

### Analisis de Seguridad
```
/expert-patterns src/services/auth.ts security
```

Output incluira:
- Comparacion con OWASP Top 10
- Patrones de bcrypt/argon2
- JWT best practices
- Session handling

### Analisis de API
```
/expert-patterns src/routes/users.ts api
```

Output incluira:
- RESTful conventions
- Elysia patterns
- Error handling
- Validation schemas

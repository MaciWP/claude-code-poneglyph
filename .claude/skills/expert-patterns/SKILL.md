---
name: expert-patterns
description: |
  Analiza código comparándolo con best practices de docs oficiales, blogs de expertos,
  repos exitosos (>1k stars) y estándares de la industria (OWASP).
  Use when: reviewing code, implementing new patterns, validating architecture.
  Keywords - best practice, pattern, expert, compare, industry standard, owasp,
  clean code, architecture, design pattern
activation:
  keywords:
    - best practice
    - pattern
    - expert
    - compare
    - industry standard
    - owasp
    - clean code
    - architecture
    - design pattern
    - official docs
for_agents: [builder, reviewer, scout]
version: "1.0"
---

# Expert Patterns Analysis

Compara código del proyecto con best practices de múltiples fuentes autorizadas.

## When to Use

| Agente | Caso de Uso |
|--------|-------------|
| builder | Antes de implementar un patrón nuevo |
| reviewer | Validando código contra best practices |
| scout | Buscando cómo otros resuelven el problema |

## Sources

### Static Knowledge Base
| Archivo | Contenido |
|---------|-----------|
| `knowledge-base/bun-patterns.md` | Bun runtime patterns |
| `knowledge-base/elysia-patterns.md` | Elysia framework |
| `knowledge-base/react-patterns.md` | React modern |
| `knowledge-base/typescript-patterns.md` | TypeScript advanced |
| `knowledge-base/owasp-checklist.md` | Security checklist |
| `knowledge-base/repo-patterns.md` | Repos exitosos |

### Dynamic Sources
| Fuente | Método |
|--------|--------|
| Docs oficiales | WebFetch a URLs conocidas |
| Blogs expertos | WebSearch + WebFetch |
| Repos exitosos | WebSearch "github [pattern] stars:>1000" |

## Analysis Process

1. **Detect Pattern Category**
   - Security: auth, validation, crypto
   - API: routes, endpoints, REST
   - UI: components, hooks, state
   - Data: queries, caching, transactions

2. **Gather Sources**
   - Read static knowledge base
   - WebFetch official docs (if online)
   - WebSearch expert blogs (if needed)

3. **Compare Implementation**
   - Current code vs documented pattern
   - Identify gaps and anti-patterns
   - Calculate confidence score

4. **Generate Recommendations**
   - Prioritized improvements
   - Code examples from authoritative sources
   - Links to documentation

## Output Format

```markdown
## Expert Pattern Analysis: [file]

### Current Implementation
| Pattern | Status | Line |
|---------|--------|------|
| [pattern] | Good/Partial/Missing | [line] |

### Best Practices Comparison

#### Official Docs
| Practice | Current | Recommended | Source |
|----------|---------|-------------|--------|

#### Expert Blogs
| Expert | Pattern | Applies | Source |
|--------|---------|---------|--------|

#### Successful Repos
| Repo | Pattern | Gap | Link |
|------|---------|-----|------|

### Recommendations
1. **High**: [recommendation]
2. **Medium**: [recommendation]

### Confidence: [0-100]%
```

## Checklist

- [ ] Consulted static knowledge base
- [ ] Checked official documentation
- [ ] Searched expert opinions (if ambiguous)
- [ ] Provided actionable recommendations
- [ ] Included source links

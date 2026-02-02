# Expert Pattern Sources

URLs y fuentes de conocimiento para analisis de patrones.

## Official Documentation

| Framework | URL | Topics |
|-----------|-----|--------|
| Bun | https://bun.sh/docs | Runtime, APIs, Testing |
| Elysia | https://elysiajs.com/essential/route | Routes, Plugins, Validation |
| React | https://react.dev/reference/react | Hooks, Components, Patterns |
| TypeScript | https://www.typescriptlang.org/docs/handbook | Types, Generics, Utility Types |

## Expert Blogs

| Expert | URL | Specialty |
|--------|-----|-----------|
| Kent C. Dodds | https://kentcdodds.com/blog | Testing, React patterns |
| Dan Abramov | https://overreacted.io | React internals, mental models |
| Josh W. Comeau | https://www.joshwcomeau.com | CSS, React, animations |
| Matt Pocock | https://www.totaltypescript.com/articles | TypeScript advanced |
| Tanner Linsley | https://tanstack.com/blog | State management, queries |

## Standards & Security

| Standard | URL | Topics |
|----------|-----|--------|
| OWASP Top 10 | https://owasp.org/Top10/ | Security vulnerabilities |
| MDN Web Docs | https://developer.mozilla.org | Web APIs, standards |
| Node.js Best Practices | https://github.com/goldbergyoni/nodebestpractices | Backend patterns |

## Successful Repos (>1k stars)

| Category | Search Query | Example Repos |
|----------|--------------|---------------|
| Elysia apps | `elysia stars:>100` | elysia-examples |
| Bun projects | `bun typescript stars:>500` | bun-examples |
| React patterns | `react patterns stars:>5000` | bulletproof-react |
| TypeScript | `typescript starter stars:>1000` | ts-reset |
| API design | `rest api typescript stars:>2000` | trpc |

## Search Templates

### For WebSearch
```
# Official docs
"[framework] [pattern] site:bun.sh OR site:elysiajs.com"

# Expert blogs
"[pattern] best practice site:kentcdodds.com OR site:overreacted.io"

# Repos
"github [pattern] typescript stars:>1000"
```

### For WebFetch
```
# Direct doc links
https://bun.sh/docs/api/[topic]
https://elysiajs.com/[section]/[topic]
https://react.dev/reference/react/[hook-or-api]
```

## Rate Limiting

| Source | Limit | Cache |
|--------|-------|-------|
| WebSearch | 5/min | 15 min |
| WebFetch | 10/min | 5 min |
| GitHub | 60/hour | 30 min |

## Fallback Strategy

1. Knowledge base estatica (siempre disponible)
2. WebFetch docs oficiales
3. WebSearch blogs expertos
4. Reportar "fuentes limitadas" si todo falla

---
parent: orchestrator-protocol
name: skill-matching
description: Keywords→skills table, task type detection, priority scoring, synergy rules, skills without keywords.
---

# Skill Matching + Keywords

## Keywords → Skills Table

| Keywords in Prompt | Skill to Load |
|--------------------|--------------|
| auth, jwt, password, security, token, session | `security-review` |
| database, sql, drizzle, migration, query, orm, transaction | `database-patterns` |
| refactor, extract, SOLID, clean, simplify | `code-quality` |
| log, logging, trace, debug, observability | `logging-strategy` |
| error, retry, circuit, fallback, recovery | `diagnostic-patterns` |
| performance, memory, optimization, bottleneck, slow, n+1 | `performance-review` |
| definition, references, hover, symbols, lsp | `lsp-operations` |
| code quality, code smells, SOLID, complexity, duplication | `code-quality` |
| validate, verify, check, exists, hallucination, confidence | `anti-hallucination` |
| careful, strict, production, critical, hotfix | `careful-mode` |
| freeze, readonly, read-only, no-edit, lock | `freeze-mode` |
| decide, decision, choose, evaluate, trade-off | `decide` |
| traces, cost, usage, tokens, spending | `traces` |
| prompt, improve prompt, refine, ambiguous, vague | `prompt-engineer` |
| CLAUDE.md, settings.json, permissions, env vars | `meta-settings-cookbook` |
| sync claude, symlink config, share globally | `sync-claude` |

## Task Type Detection

When keywords don't match cleanly, detect by task type:

| Task Type | Primary Skill |
|-----------|--------------|
| Performance investigation | `performance-review` |
| Auth/permissions change | `security-review` |
| Code cleanup/refactor | `code-quality` |
| Debugging unknown error | `diagnostic-patterns` |

## Priority Scoring

```
score = +2 per keyword match
       + 2 per path rule match
       + 1 per task-type match
       + 1 per synergy partner in set
       - 3 if in conflict with higher-scored skill
```

If > 3 matches: prioritize keyword frequency → main domain → discard generic if specific exists.

## Synergy Rules

Some skills reinforce each other — both receive +1 when paired:

| Pair | Synergy |
|------|---------|
| `diagnostic-patterns` + `logging-strategy` | Error tracing |

## Conflict Rules

If two skills compete for the same slot and one is more specific, discard the generic:

| Generic | Specific (wins) |
|---------|----------------|
| `code-quality` | `security-review` (when security is the primary concern) |

## Skills Without Keywords (Always-Loaded Baseline)

These are pre-loaded per agent role via frontmatter — they don't need keyword matching:

| Agent | Always-loaded skills |
|-------|---------------------|
| builder | `anti-hallucination` |
| reviewer | `code-quality`, `security-review`, `performance-review`, `anti-hallucination` |
| error-analyzer | `diagnostic-patterns` |

Do NOT count these against the agent's max additional skill limit (they are free).

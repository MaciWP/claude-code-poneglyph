# Context Management

Rules for loading skills and context into agents. Avoid overloading agents with irrelevant context.

## Skill Loading Limits

| Agent | Base Skills (free) | Max Additional | Total Max | Notes |
|-------|--------------------|----------------|-----------|-------|
| builder | anti-hallucination | 5 | 6 | Base is free, does not count against max |
| reviewer | code-quality, security-review, performance-review, anti-hallucination | 2 | 6 | Base skills are free |
| error-analyzer | diagnostic-patterns | 2 | 3 | + matched skills |
| architect | — | 4 | 4 | |
| planner | — | 2 | 2 | High-level only |
| scout | — | 1 | 1 | Minimal context |
| command-loader | — | 0 | 0 | Infrastructure only |

## Precedence Rules

1. **Domain-specific skills > generic skills** — always prioritize specific ones
2. **Base skills do not count** against the agent's max limit
3. **If keyword matches > agent max**: prioritize by keyword frequency in the prompt
4. **If tied**: prefer skills from the task's primary domain

## Composition Rules

When multiple skills apply, respect synergies and conflicts:

1. **Synergy**: If two matched skills are a synergic pair (see `skill-matching.md`), both receive +1 priority
2. **Conflict**: If two skills are a conflicting pair, discard the one with the lower score
3. **Budget overflow**: If matches > agent max, sort by score and truncate
4. **Base skills**: do NOT count against the max limit (they are free)
5. **Frontmatter skills**: DO count against the agent's max limit

## Context Loading Methods

| Method | When | Example |
|--------|------|---------|
| Skill (via Skill tool) | Domain patterns, best practices | `security-review` |
| Scout agent | Codebase exploration, finding files | "Find all auth-related files" |
| Explore agent | Deep codebase analysis | "How does the auth system work?" |

## Agent Expertise (Does Not Count Against Skill Limits)

Each agent has a persistent expertise file at `.claude/agent-memory/{agent}/EXPERTISE.md`.

| Aspect | Detail |
|--------|--------|
| Loading | Lead injects when delegating (last ~3K tokens) |
| Cost against limits | **Does NOT count** against the agent's skill limits |
| Updates | Automatic via SubagentStop hook |
| Max size | 5K tokens (~20K chars) with FIFO pruning |

### Expertise vs Skills vs Memory

| Type | Maintained by | Content | Persistence |
|------|---------------|---------|-------------|
| Skills | Developer (manual) | Generic patterns and best practices | Static |
| Expertise | Automatic hook | Agent insights about the codebase | Grows per session |
| Memory | User | Preferences, feedback, project context | Manual |
| Patterns | Automatic hook | Successful agent→agent sequences | Grows per session |

## Anti-Patterns

| Anti-Pattern | Problem | Alternative |
|--------------|---------|-------------|
| Loading >5 skills for a builder | Context overload, diluted responses | Prioritize top 5 by relevance |
| Loading generic skills when specific ones exist | Unnecessary noise | Domain-specific first |
| Using scout when you already know the paths | Waste of tokens/time | Direct Read or delegate to builder |
| Loading skills without a keyword match | Irrelevant context | Only load if keywords match |
| Counting base skills in the limit | Limits useful skills | Base skills are free |

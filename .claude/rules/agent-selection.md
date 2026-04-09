# Agent Selection

## Selection Matrix

| Signal | Agent | Skill/Mode | Fallback |
|--------|-------|------------|----------|
| implement, create, fix, build | builder | (by prompt) | — |
| refactor, extract, simplify, restructure | builder | code-quality | — |
| merge conflict, git conflict | builder | (prompt context) | — |
| docs, sync, documentation | builder | (doc task) | — |
| bug documentation, knowledge base | builder | diagnostic-patterns | — |
| review, validate, check | reviewer | standard mode | — |
| security, audit, vulnerability, owasp | reviewer | security-review | — |
| code quality, smells, SOLID, complexity | reviewer | code-quality | — |
| test coverage, missing tests | reviewer | coverage mode | — |
| performance, slow, bottleneck, N+1 | reviewer | performance-review | — |
| plan, design, decompose, workflow | planner | — | architect |
| >3 subtasks, breakdown, dependencies | planner | (decomposition built-in) | — |
| find, explore, search codebase | scout | — | Explore agent |
| error, failing, debug, diagnose | error-analyzer | diagnostic-patterns | builder (obvious fix) |
| architecture, RFC, design system | architect | — | planner |

## Multi-Agent Patterns

| Pattern | Agents | When |
|---------|--------|------|
| **Explore then Build** | scout + builder | scout provides context, builder implements |
| **Plan then Build** | planner -> N builders parallel | complexity >60 |
| **Build then Review** | builder -> reviewer | mandatory for multi-file changes |
| **Error then Fix** | error-analyzer -> builder | diagnosis before fix |
| **Worktree Parallel** | 2+ builders in worktrees | Parallel builders with file overlap potential |
| **Security Review** | reviewer (security mode, model: opus) | Auth/security changes |
| **Tiered Build** | architect + N builders + reviewer | complexity 45-60, 2-3 domains with shared interfaces |
| **Team Parallel** | teammates (general-purpose) | execution_mode=team, 3+ dominios independientes, complexity >60 |

## Anti-Patterns

| Anti-Pattern | Problem | Use Instead |
|--------------|---------|-------------|
| builder for exploration | misses context, wastes tokens | scout |
| planner for complexity <30 | overkill, slows execution | builder directo |
| skipping reviewer after multi-file changes | quality risk | reviewer checkpoint |
| single builder for >60 complexity without planner | uncoordinated, error-prone | planner -> N builders |
| 2+ builders paralelos sin worktree en archivos solapados | Conflictos de escritura | Activar `isolation: "worktree"` |
| team mode para <3 dominios | 3-7x coste sin beneficio real | parallel builders en worktrees |
| team mode para dominios dependientes | conflictos de archivos entre teammates | subagents secuenciales |

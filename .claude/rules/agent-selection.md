# Agent Selection

## Selection Matrix

| Signal | Agent | Fallback | NOT when |
|--------|-------|----------|----------|
| implement, create, fix | builder | - | complexity >60 (planner first) |
| review, validate, check | reviewer | - | - |
| plan, design, decompose complex | planner | architect | complexity <30 |
| find, explore, search codebase | scout | Explore agent | - |
| error, failing, debug | error-analyzer | builder (obvious fix) | - |
| refactor, extract, simplify | refactor-agent | builder (small change) | - |
| security, audit, vulnerability | security-auditor | reviewer | - |
| merge conflict, git conflict | merge-resolver | builder (trivial) | - |
| test coverage, missing tests | test-watcher | builder | - |
| docs, sync, documentation | knowledge-sync | builder | - |
| >3 subtasks, decompose | task-decomposer | planner | - |
| architecture, RFC, design system | architect | planner | simple features |
| code quality, code smells | code-quality | reviewer | - |
| UI testing, browser, e2e | builder | - | Load playwright-browser skill |
| bug documentation, knowledge base | bug-documenter | builder | - |

## Multi-Agent Patterns

| Pattern | Agents | When |
|---------|--------|------|
| **Explore then Build** | scout + builder | scout provides context, builder implements |
| **Plan then Build** | planner -> N builders parallel | complexity >60 |
| **Build then Review** | builder -> reviewer | mandatory for multi-file changes |
| **Error then Fix** | error-analyzer -> builder | diagnosis before fix |
| **Worktree Parallel** | 2+ builders + merge-resolver | Parallel builders con file overlap potencial |

## Anti-Patterns

| Anti-Pattern | Problem | Use Instead |
|--------------|---------|-------------|
| builder for exploration | misses context, wastes tokens | scout |
| builder for security review | lacks audit checklist | security-auditor |
| planner for complexity <30 | overkill, slows execution | builder directo |
| skipping reviewer after multi-file changes | quality risk | reviewer checkpoint |
| single builder for >60 complexity without planner | uncoordinated, error-prone | planner -> N builders |
| 2+ builders paralelos sin worktree en archivos solapados | Conflictos de escritura | Activar `isolation: "worktree"` para cada builder |

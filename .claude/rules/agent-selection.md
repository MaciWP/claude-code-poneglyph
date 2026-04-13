# Agent Selection

## Selection Matrix

The "Suggested skills to Read (for delegation)" column lists `.claude/skills/<name>/SKILL.md` paths the Lead should include in the delegation prompt's `[RELEVANT SKILLS FOR THIS TASK]` block (Arch H). Max 3 per delegation. Pick the ones whose paths actually match the task context; skip the column if none apply. **Project skills** (`./.claude/skills/`) are also valid — check the project's `skill-matching.md` if it exists.

| Signal | Agent | Skill/Mode | Suggested skills to Read (for delegation) | Fallback |
|--------|-------|------------|-------------------------------------------|----------|
| implement, create, fix, build | builder | (by prompt) | (match domain below) | — |
| implement Django endpoint/model/service | builder | (by prompt) | django-api, django-architecture, django-query-optimizer | — |
| implement React component/hook | builder | (by prompt) | react-best-practices, bulletproof-architecture, frontend-code-style | — |
| implement React form | builder | (by prompt) | form-patterns, frontend-code-style | — |
| refactor, extract, simplify, restructure | builder | code-quality | code-quality, code-style-enforcer | — |
| merge conflict, git conflict | builder | (prompt context) | — | — |
| docs, sync, documentation | builder | (doc task) | — | — |
| bug documentation, knowledge base | builder | diagnostic-patterns | diagnostic-patterns | — |
| review, validate, check (generic) | reviewer | standard mode | code-quality, pr-conventional-comments | — |
| review Django code | reviewer | standard mode | django-review-lessons, django-api, pr-conventional-comments | — |
| review React code | reviewer | standard mode | frontend-review-lessons, react-best-practices, pr-conventional-comments | — |
| security, audit, vulnerability, owasp | reviewer | security-review | security-review, django-review-lessons | — |
| code quality, smells, SOLID, complexity | reviewer | code-quality | code-quality, code-style-enforcer | — |
| test coverage, missing tests (Django) | reviewer | coverage mode | django-testing-patterns | — |
| test coverage, missing tests (React) | reviewer | coverage mode | frontend-testing-patterns | — |
| performance, slow, bottleneck, N+1 | reviewer | performance-review | performance-review, django-query-optimizer | — |
| OpenAPI contract, API schema | builder / reviewer | (by prompt) | openapi-contract, openapi-frontend-contract | — |
| plan, design, decompose, workflow | planner | — | — | architect |
| >3 subtasks, breakdown, dependencies | planner | (decomposition built-in) | — | — |
| find, explore, search codebase | scout | — | — | Explore agent |
| error, failing, debug, diagnose | error-analyzer | diagnostic-patterns | diagnostic-patterns | builder (obvious fix) |
| architecture, RFC, design system | architect | — | bulletproof-architecture, django-architecture | planner |

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
| **Team Parallel** | teammates (general-purpose) | execution_mode=team, 3+ independent domains, complexity >60 |

## Anti-Patterns

| Anti-Pattern | Problem | Use Instead |
|--------------|---------|-------------|
| builder for exploration | misses context, wastes tokens | scout |
| planner for complexity <30 | overkill, slows execution | builder direct |
| skipping reviewer after multi-file changes | quality risk | reviewer checkpoint |
| single builder for >60 complexity without planner | uncoordinated, error-prone | planner -> N builders |
| 2+ builders in parallel without worktree on overlapping files | Write conflicts | Activate `isolation: "worktree"` |
| team mode for <3 domains | 3-7x cost with no real benefit | parallel builders in worktrees |
| team mode for dependent domains | file conflicts between teammates | sequential subagents |

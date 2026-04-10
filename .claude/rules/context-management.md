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

## Agent Memory (Does Not Count Against Skill Limits)

Each agent has a persistent memory file at `.claude/agent-memory/{agent}/MEMORY.md`.

| Aspect | Detail |
|--------|--------|
| Loading | Lead injects when delegating (last ~3K tokens) |
| Cost against limits | **Does NOT count** against the agent's skill limits |
| Updates | Automatic via SubagentStop hook |
| Max size | 5K tokens (~20K chars) with FIFO pruning |

### Memory vs Skills vs Patterns

| Type | Maintained by | Content | Persistence |
|------|---------------|---------|-------------|
| Skills | Developer (manual) | Generic patterns and best practices | Static |
| Memory | Automatic hook + user | Agent insights about the codebase, user preferences, project context | Grows per session |
| Patterns | Automatic hook | Successful agent→agent sequences | Grows per session |

## Skill Propagation Model (Empirically Verified)

Ground-truth rules for how skill and context content reach subagents. Verified via direct testing over 2026-04-10 (including Test 7, which validated Arch H — Lead-Directed Skill Reads). **Do not confuse what the Lead loads with what a subagent sees — they are different contexts.**

### What reaches a subagent automatically at spawn

| Mechanism | Reaches subagent? | Notes |
|---|---|---|
| Rules from `.claude/rules/` (project + global) | **YES** | Auto-injected into the subagent's system prompt. This is the heaviest-lifting propagation mechanism — put routing, conventions, and stable domain patterns here. |
| `CLAUDE.md` (project + global) | **YES** | Both levels auto-propagate. |
| Frontmatter `skills:` in the agent definition | **YES** | Full `SKILL.md` bodies are pre-injected at spawn via `<command-message>` wrappers, unconditionally. All-or-nothing pre-load — cannot be varied per-task. |
| Baseline skills pre-declared per agent role (e.g., reviewer always gets `code-quality` + `anti-hallucination`) | **YES** | Arrive at spawn regardless of task. |
| Content pasted verbatim by the Lead into the delegation prompt (including `MEMORY.md` injection) | **YES** | Behaves like any other prompt content. |
| Subagent `Read`s `.claude/skills/<name>/SKILL.md` when instructed by the Lead in the delegation prompt (**Arch H**) | **YES** | **Validated via Test 7 on 2026-04-10** — subagent cites skill content verbatim in its work. This is the recommended task-specific loading mechanism. |

### What does NOT reach a subagent

| Mechanism | Why not |
|---|---|
| Lead invokes `Skill()` before delegating | Loaded content stays in the Lead's context. Subagents spawn fresh. |
| Subagent tries to call `Skill()` when `Skill` is not in its `tools:` allowlist | **The tool does not exist in the subagent's environment.** Default agents (`reviewer`, `builder`, `scout`, `error-analyzer`, etc.) do NOT have `Skill` in their tools list. A prompt that says *"First action: invoke `Skill('X')`"* is ceremonial and has no effect. Use Arch H (`Read .claude/skills/<name>/SKILL.md`) instead. |

### Consequences for orchestration

- **Rules + CLAUDE.md are the real context carriers.** Invest in them. A well-written project rule reaches every subagent automatically.
- **Prefer Lead-directed `Read`s (Arch H) over frontmatter `skills:` pre-injection** for task-specific skill loading. Arch H is flexible (choose skills per task), avoids the all-or-nothing pre-load problem, and works with every default agent because `Read` is always in the allowlist.
- **Frontmatter `skills:` is still useful** as a baseline for agents whose role always needs the same skills (e.g., reviewer's `code-quality`). For anything variable per task, use Arch H.
- **Path-scoped loader quirk**: in `.claude/rules/paths/*.md`, globs starting with `**` require at least one leading path segment to match. A raw `apps/...` pattern will NOT match `apps/foo.py`; use `src/apps/...`, `backend/apps/...`, or prefix with `**/` explicitly.

### Anti-claims (do not repeat)

1. *"Skill loaded by the Lead is automatically available to subagents."* — False. Lead context does not transit.
2. *"Subagents can invoke `Skill()` dynamically."* — False for default agents. True only if the agent has `Skill` explicitly in its `tools:` allowlist.
3. *"A prompt preamble instructing the subagent to invoke `Skill()` works."* — False. Use `Read .claude/skills/<name>/SKILL.md` instead (Arch H).

## Anti-Patterns

| Anti-Pattern | Problem | Alternative |
|--------------|---------|-------------|
| Loading >5 skills for a builder | Context overload, diluted responses | Prioritize top 5 by relevance |
| Loading generic skills when specific ones exist | Unnecessary noise | Domain-specific first |
| Using scout when you already know the paths | Waste of tokens/time | Direct Read or delegate to builder |
| Loading skills without a keyword match | Irrelevant context | Only load if keywords match |
| Counting base skills in the limit | Limits useful skills | Base skills are free |

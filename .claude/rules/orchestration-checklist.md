# Orchestration Pre-Action Protocol (MANDATORY)

Before responding to ANY user prompt, execute steps 1-5 IN ORDER. Do NOT skip.

**Apply when**: Always. Every prompt. No exceptions.

## Step 1: Triage

| Condition | Action |
|-----------|--------|
| Trivial task (typo, rename, 1 line, simple question) | Skip to Step 4 |
| Vague prompt (score < 70) | Load skill `prompt-engineer`, clarify |
| Clear prompt (score >= 70) | Continue to Step 2 |

## Step 2: Complexity

Calculate score and show inline: `Complexity: ~XX`

| Score | Routing |
|-------|---------|
| < 15 | builder direct, skip scoring/skills |
| 15-30 | builder direct |
| 30-60 | planner optional |
| > 60 | planner MANDATORY |

Factors: Files, Domains, Dependencies, Security, Integrations (see `complexity-routing.md`).

## Step 3: Prepare Context

1. Extract keywords from prompt
2. Consult `skill-matching.md` of the project (if it exists) or global
3. Load max 3 skills via `Skill()` BEFORE delegating
4. Check if there is a specialized agent (e.g.: `django-refactor-agent`, `django-security-auditor`)

## Step 4: Delegate

| Tool | Usage |
|-------------|-----|
| `Agent(subagent_type="builder")` | Implement code |
| `Agent(subagent_type="scout")` | Explore codebase |
| `Agent(subagent_type="planner")` | Plan complex tasks |
| `Agent(subagent_type="reviewer")` | Validate changes |
| `Skill()` | Load domain context |

**PROHIBITED to use directly**: Read, Edit, Write, Bash, Glob, Grep.
**Exceptions**: CLAUDE.md, memory/, .claude/, conftest.py, plan files.
**Parallelize**: Independent agents in the SAME message.

## Step 5: Validate

| Change type | Validation |
|----------------|-----------|
| Single file, low complexity | Builder confirms tests passing |
| Multi-file | Delegate to reviewer |
| Security-related | security-auditor |
| Cross-domain | reviewer + test-watcher |

**NEVER report "completed" without confirmation that tests are passing.**

## When NOT to Apply This Protocol

- Answering questions without code (explanations, decisions)
- Reading CLAUDE.md or memory for orientation
- Loading skills via Skill tool
- Writing/updating plan files or memory

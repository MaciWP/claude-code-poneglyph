# Orchestration Pre-Action Protocol (MANDATORY)

Before responding to ANY user prompt, execute steps 1-5 IN ORDER. Do NOT skip.

**Apply when**: Always. Every prompt. No exceptions.

## Step 1: Triage

| Condition | Action |
|-----------|--------|
| Trivial task (typo, rename, 1 line, simple question) | Skip to Step 4 |
| Vague prompt AND genuine doubt | Use `AskUserQuestion` or invoke `prompt-engineer` skill to refine |
| Clear prompt (score >= 70, or pragmatically clear) | Continue to Step 2 |

## Step 2: Complexity

Calculate score and show inline: `Complexity: ~XX`

| Score | Routing |
|-------|---------|
| < 15 | builder direct, skip scoring/skills |
| 15-30 | builder direct |
| 30-60 | planner optional |
| > 60 | planner MANDATORY |

Factors: Files, Domains, Dependencies, Security, Integrations (see `complexity-routing.md`).

## Step 3: Prepare Context (Arch H: Lead-Directed Skill Reads)

1. Check if `memory-inject.ts` emitted a `## Path-Based Skills (for delegation)` section based on paths in the user prompt
2. If yes → copy those `Read .claude/skills/<name>/SKILL.md` suggestions verbatim into the delegation prompt's `[RELEVANT SKILLS FOR THIS TASK]` block
3. If no → match keywords manually against `.claude/rules/paths/*.md` or the skills inventory, pick max 3 skills
4. **Also check the project's `skill-matching.md` rule** (if it exists) for project-specific skill mappings — these point to `./.claude/skills/<name>/SKILL.md` paths
5. Do NOT invoke `Skill()` as a delegation mechanism — default subagents cannot access skills via that tool; instruct the subagent to `Read` the SKILL.md files instead
6. `Skill()` invocation by the Lead is still valid for the Lead's OWN context (main session only), but it does NOT propagate to delegated subagents
7. Check if there is a specialized agent (e.g.: `django-refactor-agent`, `django-security-auditor`)

## Step 4: Delegate

| Tool | Usage |
|-------------|-----|
| `Agent(subagent_type="builder")` | Implement code |
| `Agent(subagent_type="scout")` | Explore codebase |
| `Agent(subagent_type="planner")` | Plan complex tasks |
| `Agent(subagent_type="reviewer")` | Validate changes |
| `Skill()` | Load domain context |

**Delegation triggers (delegate WHEN any fires — see lead-orchestrator.md "Delegation Triggers")**:
- Trigger A — Parallelization: 2+ independent subtasks with no data dependency
  - Sub-clause A.1: simple work + parallelizable → prefer haiku/sonnet batch over inline opus
- Trigger B — Context preservation: would read >10 files, >5 grep/glob, or process >15K tokens inline

**Direct-action whitelist (NO trigger fires → may execute directly)**:
- `git status`, `git log`, `git diff`, `git show` — verify state after delegated tasks
- `git mv` of a single file (pure rename, no content change)
- Read CLAUDE.md, memory/, .claude/, plan files for orientation
- Answer user questions that need zero file writes
- Reading ≤3 files inline when no trigger fires (e.g., confirming a single anchor before drafting a delegation prompt)

Anything else — even "quick" 1-line edits or single-variable renames — goes through a builder. Ceremony cost is the price of context cleanliness for non-trivial work.

**Parallelize**: When Trigger A fires, send all independent Agents in the SAME message. Self-check: "any second independent Task here?" Document dependency inline if not.

> All delegations must include the [QUALITY STANCE] block (see lead-orchestrator.md delegation template). The Regla de Oro is non-negotiable.

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

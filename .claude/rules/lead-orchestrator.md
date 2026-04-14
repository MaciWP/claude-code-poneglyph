# Lead Orchestrator Rules

The main session acts as a **pure orchestrator**. It does not execute code directly.

## NEVER (Prohibited)

| Prohibited Action | Reason |
|------------------|-------|
| Read files directly (Read) | Delegate to scout or builder |
| Edit code directly (Edit) | Delegate to builder |
| Write files (Write) | Delegate to builder |
| Execute bash commands (Bash) | Delegate to builder |
| Search with Glob/Grep | Delegate to scout/Explore |
| Direct web fetch | Agents have access |

## ALWAYS (Required)

| Required Action | How |
|------------------|------|
| Delegate code to builder | `Task(subagent_type="builder", prompt="...")` |
| Validate with reviewer | `Task(subagent_type="reviewer", prompt="...")` |
| Plan complex tasks | `Task(subagent_type="planner", prompt="...")` |
| Explore codebase | `Task(subagent_type="scout", prompt="...")` |
| Analyze errors | `Task(subagent_type="error-analyzer", prompt="...")` |
| Load relevant skills | `Skill(skill="...")` (Lead's own context — global skills) OR embed `Read` instructions for global/project skills in delegation prompt (Arch H) |
| Propagate permission mode | When Lead session runs with `bypassPermissions` mode, pass `mode: "bypassPermissions"` explicitly in each `Agent()` call. Subagents do NOT inherit the Lead's permission mode automatically. Without this, subagents revert to default permission mode and block the user with prompts even when the session has `--dangerously-skip-permissions`. |
| Clarify requirements | `AskUserQuestion(questions=[...])` |

## Workflow

> Full end-to-end flow: score prompt → calc complexity → pick skills → delegate → reviewer checkpoint. See `complexity-routing.md` and `orchestration-checklist.md` for the decision tables.

## Delegation Triggers (POSITIVE — actively look for these)

The Lead's job is to find reasons to delegate, not reasons to avoid it. Two quantified triggers, sourced from Anthropic Claude Code docs:

| Trigger | Threshold (objective) | Source |
|---|---|---|
| **A. Parallelization** | 2+ subtasks with NO data dependency between them | Anthropic: "three or more independent pieces of work" |
| **B. Context preservation** | Task would require reading >10 files, >5 grep/glob queries, or processing >15K tokens of content inline | Anthropic: "exploring ten or more files" |

When ANY trigger fires → delegate. When BOTH fire → batch in parallel (one message, multiple Agent calls).

| Guardrail | Rule | Source |
|---|---|---|
| **Sub-clause A.1 — Cost arbitrage** | Simple parallelizable work (complexity <30) → prefer haiku/sonnet agent batch over inline opus. Lead runs on opus (~5x sonnet, ~25x haiku); inline opus on cheap work is the worst $/task ratio. | See `complexity-routing.md §Model Routing` |
| **Coordination cost veto** | If 2+ "parallel" subtasks share >40% of context, coordination overhead exceeds parallelism gain — use 1 agent. **Cheap-model relaxation**: haiku/sonnet parallelism relaxes the veto to >70% (cheap tokens absorb the coordination tax). | Stanford 2025 |
| **No hard cap, avoid artificial parallelization** | No fixed batch-size cap, but splitting work that doesn't truly need separation (just to hit a number) degrades output — incoherent results, lost integration context, fragmented reasoning. Regla de Oro decides: quality over count. | Osmani field data (diminishing returns >4 agents — informational) |

**Self-check before EVERY delegation message**: "Is there any other independent Task I could batch into this same message?" If no, state the reason inline ("solo delegation — waiting on scout before builder"). Solo-delegation without stated dependency is anti-pattern.

> Every delegation serves the Regla de Oro (CLAUDE.md). Quality is the lodestar — these triggers exist because cleaner Lead context produces better orchestration decisions.

## Allowed Tools

| Tool | Usage |
|------|-----|
| `Task` | Delegate to specialized agents |
| `Skill` | Load skills for context |
| `AskUserQuestion` | Clarify requirements |
| `TaskList/TaskCreate/TaskUpdate` | Manage task list |

## Memory + Skill Injection When Delegating (Arch H: Lead-Directed Skill Reads)

When delegating to any agent, the Lead MUST build the prompt with TWO pre-injected context blocks: accumulated memory AND a list of skill files for the subagent to Read as its first actions.

**Why**: default subagents (`builder`, `reviewer`, `scout`, `error-analyzer`, `planner`, `architect`) do NOT have `Skill` in their tools allowlist and cannot invoke `Skill()` dynamically. The Lead must instead put explicit `Read .claude/skills/<name>/SKILL.md` instructions into the delegation prompt. The subagent then Reads those files with its own `Read` tool. This is **Architecture H — Lead-Directed Skill Reads**, empirically validated on 2026-04-10 (Commandment VIII).

| Step | Action |
|------|--------|
| 1 | Read `.claude/agent-memory/{agent}/MEMORY.md` (last ~3K tokens) |
| 2 | Check if `memory-inject.ts` emitted a `## Path-Based Skills (for delegation)` section based on the user prompt's file paths — if yes, copy those `Read` suggestions into the delegation prompt |
| 3 | If no hook suggestions, match task keywords manually against `.claude/rules/paths/*.md` or the skills inventory, pick up to 3 skills |
| 4 | Build the prompt using the template below; omit any block that is empty (no memory → drop `[ACCUMULATED MEMORY]`; no relevant skills → drop `[RELEVANT SKILLS FOR THIS TASK]`) |

### Delegation Template (Arch H)

```
[ACCUMULATED MEMORY - {agent}]
{content of MEMORY.md, last 3K tokens}

[QUALITY STANCE]
Output must be: certain, sourced, simple, style-consistent, gap-free.
Ask if doubt > 30%. Verify before asserting.

[RELEVANT SKILLS FOR THIS TASK]
Before starting, your first actions must be to Read these skill files for context.
After loading them, proceed with the task.
- Read .claude/skills/<global-skill>/SKILL.md       ← from global (generic pattern)
- Read .claude/skills/<project-skill>/SKILL.md       ← from project (domain knowledge)
- Read .claude/skills/<skill-3>/SKILL.md

After loading each skill file, check if its main SKILL.md has a "Content Map", "Reference Files", or "Documentation" section (a canonical 3-column `Topic | File | Contents` table). If present, consult the Contents column to judge which supporting files are semantically relevant to your current task and Read them selectively. A semantic match in the Contents description is a valid trigger even when task phrasing doesn't explicitly mention the domain. Do NOT read all references blindly (defeats on-demand loading), but DO read those where the Contents row describes your task situation.

[TASK]
{task instructions}

[MEMORY OUTPUT]
When finished, include "### Memory Insights" with 1-5 reusable insights discovered during this task.
```

| Rule | Detail |
|------|--------|
| Max skills | 3 per delegation (avoid token bloat) |
| Source of truth | Hook-emitted suggestions > manual keyword match > omit |
| `Skill()` by the Lead | Still valid — loads domain context into the Lead's OWN session, but does NOT propagate to delegated subagents |
| Empty blocks | Omit the header entirely rather than leaving an empty section |

### Skill discovery (global + project)

When preparing a delegation:
1. Check if `memory-inject.ts` emitted `## Path-Based Skills (for delegation)` — these are global skill suggestions based on paths in the prompt
2. Check the project's `skill-matching.md` rule (auto-loaded at spawn) for project-specific skill mappings
3. Combine both into the `[RELEVANT SKILLS]` block. Max 3 skills total (1-2 global + 1-2 project is a good balance).

> **Note**: The reminder in the delegation prompt is NECESSARY. The instruction in the agent's system prompt (section "Memory Persistence") is at line 400+ and agents do not follow it consistently. The explicit reminder in the delegation prompt guarantees that insights are produced.

> Memory is read-only context. The agent uses it to inform decisions but does NOT repeat it in its output.
> Memory is updated automatically via the SubagentStop hook — the Lead does not need to manage it.

### Permission mode inheritance (IMPORTANT)

`Agent()` calls do NOT auto-inherit the Lead's session permission mode. If the Lead session runs with `bypassPermissions` (via `--dangerously-skip-permissions` flag), you MUST pass `mode: "bypassPermissions"` in the Agent tool call:

```
Agent({
  subagent_type: "builder",
  prompt: "...",
  mode: "bypassPermissions"  // ← required when Lead is bypassing
})
```

Without this, the subagent may prompt the user for file edit / bash / destructive operation permissions even when the Lead session has them bypassed — breaking the UX.

## Worktree Isolation

Activate `isolation: "worktree"` in the Agent tool to isolate parallel work.

### Routing Rules

| Condition | Use Worktree | Priority |
|-----------|--------------|-----------|
| 2+ builders delegated in parallel | Yes (each gets its own worktree) | High |
| Experimental/risk task flagged by planner | Yes | High |
| Reviewer needs a clean diff | Yes (builder in worktree) | Medium |
| Single builder, known files, no overlap | No | Low |
| Unknown target files (no planner output) | Yes (safe default) | Medium |

### Merge Strategy

| Scenario | Strategy | Agent |
|-----------|-----------|--------|
| Clean fast-forward | Auto-merge via builder | builder |
| Merge without conflicts | `git merge --no-ff` via builder | builder |
| Conflicts detected | Delegate to builder | builder |
| builder fails on merge (confidence <50%) | Escalate to user | AskUserQuestion |
| Builder with no changes | Skip merge, cleanup | Automatic |

### Cleanup Policy

| Condition | Action | Timing |
|-----------|--------|--------|
| Worktree merged OK | Delete worktree + branch | Immediate |
| Builder with no changes | Delete worktree + branch | Immediate |
| Builder failed | Preserve for 1 retry | Post error-analyzer |
| Retry also failed | Delete + escalate | Post escalation |
| Session ends with unmerged worktrees | Log warning, preserve | End of session |

### Naming Convention

| Component | Format | Example |
|-----------|---------|---------|
| Branch | `wt/<agent>/<task-hash>` | `wt/builder/a3f8c2` |
| Directory | `.worktrees/<agent>-<task-hash>` | `.worktrees/builder-a3f8c2` |

## Team Agent Execution (Experimental)

> Prerequisites, teammate prompt template, fallback and coordination protocol: see `team-routing.md`. Invoked only when planner emits `executionMode: team` — see `complexity-routing.md §Mode Selection Table` for the decision criteria and `§4-Gate Criteria (Team Mode Only)` for the gates.

## Tiered Execution Mode

> Decision criteria, mode comparison and 5-step workflow: see `complexity-routing.md §Tiered Mode`. Invoked when planner emits `executionMode: tiered`. The architect step is mandatory before builder parallelization — it produces the interface contracts each builder consumes.

### Tiered Workflow

```mermaid
graph TD
    P[Planner: executionMode=tiered] --> A[Architect: designs interfaces/contracts]
    A --> B1[Builder 1: domain A with contract]
    A --> B2[Builder 2: domain B with contract]
    B1 & B2 --> R[Reviewer: validates cross-domain integration]
```

## Continuous Validation Pipeline

Continuous validation during implementation. The Lead supervises quality checkpoints.

### Validation Checkpoints

| Checkpoint | Trigger | Agent | Action if Fails |
|-----------|---------|--------|-----------------|
| Pre-implementation | Before delegating to builder | planner | Re-plan with constraints |
| Mid-implementation | Builder reports partial progress | reviewer (background) | Early feedback to builder |
| Post-implementation | Builder completes task | reviewer | NEEDS_CHANGES → re-delegate |
| Pre-merge | Worktree ready to merge | reviewer | Block merge if fails |
| Post-merge | After successful merge | reviewer (background) | Rollback if tests fail |

### Validation by Change Type

| Change Type | Required Validations |
|----------------|------------------------|
| Single file, low complexity | Post-implementation reviewer |
| Multi-file, same domain | Post-implementation reviewer |
| Multi-file, cross-domain | Mid-checkpoint + Post reviewer |
| Security-related | Pre + Post reviewer (security-review skill, model: opus) |
| Infrastructure/config | Pre + Post reviewer + manual approval |

### Feedback Template

When sending reviewer feedback to builder, include:

| Field | Content |
|-------|-----------|
| **Status** | APPROVED / NEEDS_CHANGES / BLOCKED |
| **Issues found** | List of specific problems |
| **Suggested fixes** | Concrete actions to resolve |
| **Files affected** | Files that need changes |
| **Priority** | Critical / Major / Minor |

## Model Selection

Optimize costs by selecting the appropriate model per agent and task.

### Selection Rules

| Rule | Condition | Model |
|-------|-----------|--------|
| Default | Any agent without a specific rule | sonnet |
| High-stakes | Architecture, complex planning | opus |
| Read-only | Scout exploring codebase | haiku/sonnet |
| Budget mode | User requests cost optimization | Downgrade one level |

### Application

The Lead does NOT control the model directly (Claude Code manages it), but CAN:

1. Indicate the expected complexity in the Task prompt
2. Suggest the user change the model with `/model` if budget requires it
3. Parallelize with cheaper agents (scout with haiku) for read tasks

## Delegation by Task Type

> Signal → agent matrix (write/refactor/review/security/plan/explore/error/architect/merge/docs): see `agent-selection.md §Selection Matrix`.

## Delegation Parallelization (MANDATORY)

The Lead MUST maximize parallelism when Trigger A from "Delegation Triggers" fires. Multiple Tasks in a single message = parallel execution. See `lead-parallelism-gate.ts` (Phase 2 hook) for runtime enforcement.

### When to Parallelize

| Parallel (same message) | Sequential (wait for result) |
|--------------------------|--------------------------------|
| scout + builder on different files | builder that needs scout output |
| 2+ builders on files without dependency | builder after planner |
| 2+ reviewers on independent modules | reviewer after builder on same file |
| planner + scout for context | any Task with data dependency |

### Patterns

#### Parallel Exploration
```
Task(scout, "auth patterns") + Task(scout, "logging patterns") + Task(scout, "config patterns")
```

#### Independent Builders
```
Task(builder, "create utils/validation.ts") + Task(builder, "create utils/crypto.ts")
```

#### Review in Background
```
Task(reviewer, "review auth module", run_in_background=true) + Task(reviewer, "review users module", run_in_background=true)
```

### Anti-Patterns

| NO | YES |
|----|-----|
| scout → wait → builder (no dependency) | scout + builder in parallel |
| builder A → wait → builder B (different files) | 2 builders in parallel |
| reviewer M1 → wait → reviewer M2 | 2 reviewers in background |
| Solo delegation message without stated dependency reason | batch with 2nd Task or state "waiting on X" |
| Inline reading >10 files instead of delegating to scout | delegate to scout, reserve Lead context |
| Lead (opus) doing simple parallel work inline that haiku/sonnet could batch | delegate batch of cheap-model agents (sub-clause A.1) |

### When to use `run_in_background=true`

| Use | Do not use |
|------|---------|
| reviewer that does not block next step | builder that produces files needed for next Task |
| exploratory scout when builder can start with known files | planner whose roadmap is needed before delegating |
| audit reviewer in parallel with next feature | error-analyzer whose diagnosis determines next action |

> For tool batching (Read, Glob, Grep) and Parallel Efficiency Score, see `performance.md`.

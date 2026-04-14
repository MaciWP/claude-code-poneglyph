# Complexity Routing Rule

Calculate complexity before delegating to determine if a planner is required.

## Complexity Factors

| Factor | Weight | Low (1) | Medium (2) | High (3) |
|--------|------|---------|------------|----------|
| **Files** | 20% | 1-2 | 3-5 | 6+ |
| **Domains** | 20% | 1 | 2-3 | 4+ |
| **Dependencies** | 20% | 0-1 | 2-3 | 4+ |
| **Security** | 20% | None | Data | Auth/Crypto |
| **Integrations** | 20% | 0-1 | 2-3 | 4+ |
| **Worktree** | 0% (modifier) | Not applicable | Overlap possible | Parallel confirmed |

## Calculation

```
score = Σ (factor_value × weight × 100 / 3)
```

Each factor contributes a maximum of ~33 points (value=3 × 20% × 33.3). Total maximum = 100.

| Value | × Weight (20%) | × Scale (33.3) | Contribution |
|-------|-------------|----------------|-------------|
| Low (1) | 0.20 | 33.3 | ~7 |
| Medium (2) | 0.20 | 33.3 | ~13 |
| High (3) | 0.20 | 33.3 | ~20 |

Example:
- Files: 3-5 (Medium = 2) × 0.20 × 33.3 = ~13
- Domains: 2-3 (Medium = 2) × 0.20 × 33.3 = ~13
- Dependencies: 0-1 (Low = 1) × 0.20 × 33.3 = ~7
- Security: None (Low = 1) × 0.20 × 33.3 = ~7
- Integrations: 0-1 (Low = 1) × 0.20 × 33.3 = ~7
- **Total: ~47** → planner optional

## Routing by Complexity

| Score | Routing | Reason |
|-------|---------|-------|
| **< 15** | builder direct, skip scoring/skills | Trivial task (rename, typo, single-line) |
| **15-30** | builder direct | Simple task, no planning needed |
| **30-60** | planner optional | Consider plan if there is uncertainty |
| **> 60** | planner mandatory | Requires structured roadmap |

## Execution Mode Decision

After determining the routing by complexity, evaluate the execution mode.

### Mode Selection Table

| Score | Domains | Shared Interfaces | Mode |
|-------|----------|----------------------|------|
| < 45 | Any | - | **subagents** |
| 45-60 | 2-3 | Yes (shared types/APIs) | **tiered** |
| 45-60 | 2-3 | No (independent) | **subagents** |
| > 60 | 3+ independent (4-gate pass) | - | **team** |
| > 60 | 3+ (4-gate fail) | - | **subagents** |

> **Cost**: subagents = 1x (baseline) / tiered = ~2x / team = 3-7x. Default is ALWAYS subagents.

### Tiered Mode

Intermediate mode that applies when there are 2-3 domains with shared interfaces and complexity 45-60. The architect designs the contracts before the builders start in parallel.

| Step | Who | Action |
|------|-------|--------|
| 1 | Planner | Generates roadmap with `executionMode: "tiered"` |
| 2 | Lead → Architect | "Design interface contracts between domains X and Y" |
| 3 | Architect → Lead | Shared types, API signatures, data contracts |
| 4 | Lead → Builders (parallel) | Each receives its domain + architect's contracts |
| 5 | Lead → Reviewer | Validates cross-domain integration against contracts |

### 4-Gate Criteria (Team Mode Only)

ALL gates must be met to activate `team` mode:

| Gate | Threshold | Evaluator |
|------|-----------|-----------|
| Complexity | > 60 | Lead (previous table) |
| Independent domains | >= 3 with no shared files | Planner (decomposition analysis) |
| Inter-agent communication | Necessary (interface negotiation) | Planner (dependency analysis) |
| Feature enabled | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Env var at runtime |

### Decision

| Result | Mode | Action |
|-----------|------|--------|
| ALL gates pass | `team` | Planner generates roadmap with teammates per domain |
| ANY gate fails (score > 60) | `subagents` | Current flow unchanged |
| Score 45-60 with shared interfaces | `tiered` | Lead invokes architect first |

### Example: Team Mode Triggers

> "Implement a system with auth service, payment service and notification service, each with its own API and independent database"

- Complexity: >60 ✅
- Domains: 3 (auth, payments, notifications) with no shared files ✅
- Communication: Necessary (services consume each other's interfaces) ✅
- Env var: Configured ✅
- **→ team mode**

### Example: Team Mode Does NOT Trigger

> "Implement OAuth with Google and GitHub in the auth module"

- Complexity: >60 ✅
- Domains: 2 (Google OAuth, GitHub OAuth) but they share auth middleware ❌
- **→ subagents** (domains are not independent)

## Team Mode Execution

Operational protocol for the Lead when all 4 gates pass and team mode is active.

### Prerequisites

| Requirement | Check |
|-------------|-------|
| Env var active | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| Planner recommended team | `executionMode: team` in roadmap |
| Complexity > 60 | Calculated above |
| 3+ independent domains | No shared files between domains |

If any prerequisite fails → use subagents. Opt-out: `PONEGLYPH_DISABLE_TEAM_MODE=1` forces subagents regardless of planner recommendation.

### Teammate Prompt Template

Each teammate receives a prompt with:

| Field | Content |
|-------|---------|
| **Domain** | "Your domain is [X]. You only touch files in [paths]." |
| **Tasks** | Roadmap subtasks assigned to this domain |
| **Interfaces** | Contracts to expose/consume with other domains |
| **Constraint** | "DO NOT modify files outside your domain" |
| **Coordination** | "Use the task list to coordinate with other teammates" |

### Coordination Protocol

| Phase | Lead Action |
|-------|-------------|
| **Spawn** | Create one teammate per domain using the prompt template |
| **Monitor** | Review task list for progress. Do not intervene unless stuck. |
| **Interfaces** | Teammates negotiate contracts via task list (TaskCreate/TaskUpdate) |
| **Integration** | After all teammates complete, Lead runs reviewer over the full changeset |
| **Cleanup** | Verify no file conflicts between teammate outputs |

### Fallback to Subagents

| Trigger | Action |
|---------|--------|
| Teammate fails 2x | Extract domain tasks → run as builder subagent |
| Multiple teammates fail | Abort team mode → full fallback to subagents |
| File conflict between teammates | Lead arbitrates via reviewer. Losing domain re-executes. |
| Env var missing but planner recommended team | Silent fallback to subagents. Log warning. |
| Teammate stuck (no progress in task list) | Extract domain → builder subagent |

### Current Limitation

Teammates are always `general-purpose` (issue anthropics/claude-code#24316). They cannot use custom `.claude/agents/`. However, each teammate loads `~/.claude/` automatically — Poneglyph rules, skills and hooks apply.

## Worktree Decision

Independent of the complexity score, evaluate the need for worktree:

| Condition | Worktree |
|-----------|----------|
| Score >60 + planner generates >1 builder | Mandatory |
| 2+ builders in parallel (any score) | Mandatory |
| Task marked experimental | Mandatory |
| Score <30, single builder | Not needed |

> **Note**: Worktree rules do NOT apply in team mode. Each teammate runs in its own Claude Code process with its own filesystem. Worktree isolation only applies to subagents mode.

## Effort Routing

Effort level per agent. Unlike model routing, effort CANNOT be passed dynamically per-invocation — it is fixed in the agent's frontmatter.

> **Limitation**: `effort` in frontmatter is static. There is no `effort` parameter in the Agent tool call (open issue anthropics/claude-code#25591). That is why it is only defined in agents whose level is invariable by design.

### Effort Assignments (Frontmatter)

| Agent | effort | Rationale |
|--------|--------|-----------|
| scout | `low` | Only reads files. Does not require deep reasoning. |
| architect | `high` | High-impact strategic decisions. |
| planner | `high` | Plan quality determines all execution. |
| error-analyzer | `high` | Deep diagnosis requires extensive reasoning. |
| builder | ❌ inherit | Depends on the task. Inherits session default. |
| reviewer | ❌ inherit | Depends on review type. Inherits session default. |

> Agents without `effort` in frontmatter inherit the session level (configurable with `/effort`).

## Model Routing

Model selection per agent and complexity to optimize costs.

> **Mechanism**: The Lead determines the model by passing `model:` in the Agent tool call. Agents do NOT have model hardcoded in frontmatter — routing is dynamic based on task complexity.

### Model Selection by Agent Category

**Code agents** (builder, reviewer, error-analyzer) — produce or analyze code:

| Complexity | Model | Rationale |
|-------------|--------|-----------|
| <30 | sonnet | Minimum guaranteed quality for code |
| 30-50 | sonnet | Good balance for medium tasks |
| >50 | opus | Deep reasoning for complex tasks |

**Read-only agents** (scout) — only read, don't produce:

| Complexity | Model | Rationale |
|-------------|--------|-----------|
| <30 | haiku | Reading files does not require deep reasoning |
| 30-50 | haiku | Broader exploration, still cheap |
| >50 | sonnet | Complex exploration requires better comprehension |

**Strategic agents** (planner, architect) — high-impact decisions:

| Complexity | Model | Rationale |
|-------------|--------|-----------|
| Any | opus | Plan quality determines execution quality |

> Model defaults are determined dynamically by the Lead based on agent category and task complexity. See table above.

### Budget Alerts

> **GUIDELINE**: This rule is advisory. It is not enforced by hooks — the Lead has no real visibility of cost at runtime.

| Condition | Action |
|-----------|--------|
| Session >$1.00 | Warning to user |
| Session >$5.00 | Request confirmation to continue |
| Day >$20.00 | Review usage pattern |

## Examples

### Low Complexity (< 30)
> "Add email validation to the registration endpoint"

- Files: 1-2 (Low = 1) × 0.20 × 33.3 = ~7
- Domains: 1 (Low = 1) × 0.20 × 33.3 = ~7
- Dependencies: 1 (Low = 1) × 0.20 × 33.3 = ~7
- Security: Data (Medium = 2) × 0.20 × 33.3 = ~13
- Integrations: 0 (Low = 1) × 0.20 × 33.3 = ~7
- **Total: ~41** → planner optional

### High Complexity (> 60)
> "Implement OAuth authentication system with Google and GitHub"

- Files: 6+ (High = 3) × 0.20 × 33.3 = ~20
- Domains: 4+ (High = 3) × 0.20 × 33.3 = ~20
- Dependencies: 4+ (High = 3) × 0.20 × 33.3 = ~20
- Security: Auth (High = 3) × 0.20 × 33.3 = ~20
- Integrations: 4+ (High = 3) × 0.20 × 33.3 = ~20
- **Total: ~100** → planner mandatory

## Process

1. Analyze the user's task
2. Evaluate each factor
3. Calculate total score
4. Route according to threshold

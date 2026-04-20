---
name: orchestrator-protocol
description: |
  Full Lead orchestration protocol: verification principles, 5-step checklist,
  complexity routing, agent selection, delegation rules, and error recovery.

  Use proactively when: starting a new session as Lead orchestrator.
  Invoke ONCE per session at the start of the first real task.
  Keywords - orchestrate, delegate, complexity, routing, agent, skill, checklist
type: knowledge-base
version: "2.0"
effort: low
---

# Lead Orchestration Protocol

## §0 Verify First

Before asserting anything exists, verify with tools. Never assume.

| Need | Primary tool | Fallback |
|------|-------------|---------|
| File exists? | Glob | Read with exact path |
| Symbol exists? | LSP goToDefinition | Grep |
| Content matches? | Read | — |
| Text in file? | Grep | Read + search |

**Rule**: confidence < 70% → ask with `AskUserQuestion`, don't guess.

Read `${CLAUDE_SKILL_DIR}/references/01-verification.md` for the full tool hierarchy, confidence levels, domain-adaptive thresholds, and validation pipeline.

---

## §1 Orchestration Checklist

Execute steps 1-5 IN ORDER before responding to any user prompt. No exceptions.

### Step 1: Triage

| Condition | Action |
|---|---|
| Trivial (typo, rename, 1 line, simple question) | Skip to Step 4 |
| Vague AND genuine doubt | `AskUserQuestion` or invoke `prompt-engineer` skill |
| Clear (score ≥70, or pragmatically clear) | Continue to Step 2 |

For architectural/comparison decisions → `Skill('decide')` before proceeding.

### Step 2: Complexity

Show inline: `Complexity: ~XX`

| Score | Routing |
|---|---|
| <15 | builder direct, skip scoring/skills |
| 15-30 | builder direct |
| 30-60 | planner optional |
| >60 | planner MANDATORY |

### Step 3: Prepare Context (Arch H)

1. Check if `memory-inject.ts` emitted `## Path-Based Skills (for delegation)` — copy verbatim into delegation prompt
2. If no hook suggestions: match keywords against §5 table (see Content Map), pick max 3 skills
3. Also check project's `skill-matching.md` for project-specific skills
4. Do NOT invoke `Skill()` as a delegation mechanism — use `Read` instructions instead

### Step 4: Delegate

| Tool | Usage |
|---|---|
| `Agent(subagent_type="builder")` | Implement code |
| `Agent(subagent_type="scout")` | Explore codebase |
| `Agent(subagent_type="planner")` | Plan complex tasks |
| `Agent(subagent_type="reviewer")` | Validate changes |
| `Skill()` | Load domain context into Lead's OWN session only |

**Direct-action rules:**

**Rule 1 — Read always allowed (any path):** no complexity score required.

**Rule 2 — Write/Edit/Bash allowed directly only if:**
- Complexity explicitly calculated and scored **< 20**
- Score stated inline (e.g., "Complexity: ~12 → direct action")
- **Complexity ≥ 20**: delegate to builder regardless

**Always allowed (no score required):**
- `git status`, `git log`, `git diff`, `git show`
- `git mv` single file (pure rename)
- Answer questions needing zero file writes

**Parallelize**: when Trigger A fires, send all independent Agents in the SAME message.

### Step 5: Validate

| Change type | Validation |
|---|---|
| Single file, low complexity | Builder confirms tests passing |
| Multi-file | Delegate to reviewer |
| Security-related | security-auditor |
| Cross-domain | reviewer + test-watcher |

**NEVER report "completed" without confirmation that tests are passing.**

---

## §2 Complexity Routing

Show inline: `Complexity: ~XX`. Direct action only if complexity < 20 AND stated inline.

| Score | Routing | Mode |
|---|---|---|
| <15 | builder direct, skip scoring/skills | subagents |
| 15-30 | builder direct | subagents |
| 30-60 | planner optional | subagents or tiered |
| >60 | planner MANDATORY | subagents, tiered, or team |

Default is ALWAYS subagents. Tiered (~2x cost) only for 2-3 domains with shared interfaces at 45-60. Team (3-7x cost) only when all 4 gates pass. See Content Map for full routing tables.

---

## §3 Delegation Triggers

| Trigger | Threshold |
|---|---|
| **A. Parallelization** | 2+ subtasks with NO data dependency |
| **B. Context preservation** | Would read >10 files, >5 grep/glob, or >15K tokens inline |

When ANY trigger fires → delegate. When BOTH → batch parallel.

Self-check before EVERY delegation: "Is there another independent Task I could batch here?" Document dependency inline if not.

---

## Content Map

| Topic | File | Contents |
|---|---|---|
| Verification & anti-hallucination | `${CLAUDE_SKILL_DIR}/references/01-verification.md` | Read when claiming a file/symbol exists or confidence is below threshold. Contains tool hierarchy, confidence levels, domain-adaptive thresholds, validation pipeline (3 stages), critical keywords that always require verification, and common hallucination patterns. |
| Prompt scoring rubric | `${CLAUDE_SKILL_DIR}/references/02-prompt-scoring.md` | Read when the user's prompt feels ambiguous or scores below 70. Contains the 5-criterion table (20pts each), threshold table, improvement questions per criterion, before/after improvement example, and scoring examples. |
| Complexity routing + mode selection | `${CLAUDE_SKILL_DIR}/references/03-complexity-routing.md` | Read when calculating complexity or choosing execution mode. Contains complexity factors × weight table, formula, routing thresholds, Mode Selection Table, Tiered Mode 5-step workflow, 4-Gate Criteria for team mode, Team Mode Execution protocol, Worktree Decision, Effort Routing, Model Routing. |
| Agent selection matrix | `${CLAUDE_SKILL_DIR}/references/04-agent-selection.md` | Read when choosing which agent to delegate to. Contains the signal→agent selection matrix with suggested skills, 8 Multi-Agent Patterns, and 7 Anti-Patterns. |
| Skill matching + keywords | `${CLAUDE_SKILL_DIR}/references/05-skill-matching.md` | Read when matching task keywords to skills for Arch H delegation. Contains Keywords→Skills table (19 entries), Task Type Detection, Priority Scoring formula, Synergy Rules, Conflict Rules, and baseline skills per agent. |
| Context management + Arch H | `${CLAUDE_SKILL_DIR}/references/06-context-arch-h.md` | Read when preparing a delegation prompt or understanding what reaches subagents. Contains Architecture Levels diagram, Rules vs Skills decision table, Skill Loading Limits per agent, Propagation Model (what reaches/doesn't), full Arch H delegation template with ALL blocks, Skill Discovery steps, Content Map pattern description, Anti-claims, and orchestration consequences. |
| Delegation rules + error recovery | `${CLAUDE_SKILL_DIR}/references/07-delegation-recovery.md` | Read when a delegation fails, an agent is stuck, or you need the NEVER/ALWAYS rules. Contains NEVER/ALWAYS tables, permission mode inheritance (bypassPermissions propagation), Continuous Validation Pipeline (checkpoints + validation by change type + feedback template), Retry Budget, SendMessage vs Re-spawn decision table, Stuck Detection thresholds, Worktree Cleanup on Failure, run_in_background guidance, and Parallelization when/when-not tables. |

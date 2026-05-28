---
name: orchestrator-protocol
description: |
  Full Lead orchestration protocol: verification principles, 5-step checklist,
  complexity routing, agent selection, delegation rules, and error recovery.

  Use proactively when: starting a new session as Lead orchestrator.
  Invoke at session start; re-invoke after compaction or when protocol guidance is needed.
  Keywords - orchestrate, delegate, complexity, routing, agent, skill, checklist
disable-model-invocation: false
effort: high
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

Tool hierarchy, confidence levels, validation pipeline: `references/01-verification.md`.

---

## §1 Orchestration Checklist

Execute steps 1-5 IN ORDER before responding. No exceptions.

### Step 1: Triage

| Condition | Action |
|---|---|
| Trivial (typo, rename, 1 line, simple Q) | Skip to Step 4 |
| Vague AND genuine doubt | `AskUserQuestion` or `prompt-engineer` skill |
| Clear (score ≥70, or pragmatically clear) | Continue |

For architectural/comparison decisions → `Skill('decide')` first. Scoring rubric: `references/02-prompt-scoring.md`.

**Delegation triggers** (apply after triage — independent, fire one, the other, or both):

- **Trigger A — implementation**: ≥5 files OR architectural change → `builder`/`planner`. 1-4 files + bounded change → Lead direct. Sensitive paths (`.env`, `*.lock`, `package.json`, `.claude/settings.json`, `secrets/`, `credentials/`) require inline `sensitive: <reason ≥8 chars>`. Destructive ops (`rm -rf`, force push, schema change) — never run directly; delegate with explicit reason.
- **Trigger B — exploration**: default agent is `Explore` (Haiku, score 83). LOW+LOW (1-2 files, direct read) → Lead `Read`. LOW+HIGH / HIGH+LOW → `Explore`. HIGH+HIGH (cross-file synthesis, open-ended analysis) or design-doc audit / full-file reads past Explore's window → `scout` (Sonnet, score 60). Full matrix: `references/04-agent-selection.md` §Exploration Decision Matrix.

### Step 2: Complexity

Show inline: `Complexity: ~XX`.

| Score | Routing | Mode |
|---|---|---|
| <30 | builder direct, skip scoring/skills | subagents |
| 30-60 | planner optional | subagents or tiered |
| >60 | planner MANDATORY | subagents, tiered, or team |

> If complexity > 60, suggest `/effort xhigh` to the user — `effort` is static per agent frontmatter (CC issue #25591); compensate with richer delegation prompts.

Complexity factors × weight, tiered/team gates, worktree decision, model routing: `references/03-complexity-routing.md`.

### Step 3: Prepare Context (Arch H)

1. Check if `prompt-enrichment.ts` emitted `## Path-Based Skills (for delegation)` — copy verbatim into delegation prompt.
2. If no hook suggestions: match keywords against `references/05-skill-matching.md` (max 3 skills per agent).
3. Also check the project's path rules (`.claude/rules/paths/`) for project-specific skill conventions.
4. Do NOT invoke `Skill()` as a delegation mechanism — embed `Read .claude/skills/<name>/SKILL.md` instructions in the prompt.

Full Arch H template with all blocks, propagation model, skill discovery: `references/06-context-arch-h.md`.

### Step 4: Delegate

| Tool | Usage |
|---|---|
| `Agent(subagent_type="builder")` | Implement code |
| `Agent(subagent_type="scout")` | Explore codebase (HIGH+HIGH only — default is `Explore`) |
| `Agent(subagent_type="reviewer")` | Validate changes |
| `Skill('tech-plan')` | Plan complex tasks — Lead invokes the skill, no dedicated agent |
| `Skill('diagnostic-patterns')` | Diagnose builder failures — Lead invokes the skill, no dedicated agent |
| `Skill()` | Load context into the Lead's OWN session only |

Direct action: Read always permitted. For Edit/Write/Bash on sensitive paths (`.env`, `*.lock`, `package.json`, `.claude/settings.json`, `secrets/`, `credentials/`) declare inline `sensitive: <reason ≥8 chars>` or delegate to builder. Destructive patterns (`rm -rf`, force-push, schema changes) — delegate with explicit reason. No automated gate enforces this; the Lead is responsible.

**Parallelize**: when ≥2 Agents have no output→input dependency AND disjoint files AND no shared state, send them in the SAME assistant message. Do NOT parallelize: builder consuming a previously-produced plan, two `Edit`s on the same file, checkpoint review after writing. 6 multi-agent patterns + 7 anti-patterns: `references/04-agent-selection.md`.

### Step 5: Validate

| Change type | Validation |
|---|---|
| Single file, low complexity | Builder confirms tests passing |
| Multi-file | Delegate to `reviewer` |
| Security-related | `security-auditor` |
| Cross-domain | `reviewer` + test-watcher |

**NEVER report "completed" without confirmation that tests pass.**

Terse-first output style + escape triggers: `references/08-output-style.md`. NEVER/ALWAYS rules, retry budget, SendMessage vs re-spawn, stuck detection, worktree cleanup: `references/07-delegation-recovery.md`.

---

## Content Map

| Topic | File |
|---|---|
| Verification, anti-hallucination, confidence levels, validation pipeline | `references/01-verification.md` |
| Prompt scoring rubric (5 criteria × 20pts, threshold table, improvement Qs) | `references/02-prompt-scoring.md` |
| Complexity factors × weight, mode selection, tiered/team gates, worktree, effort/model routing | `references/03-complexity-routing.md` |
| Agent selection matrix, exploration 2×2, 8 multi-agent patterns, 7 anti-patterns | `references/04-agent-selection.md` |
| Keywords→skills mapping, priority scoring, synergy/conflict rules, baseline skills per agent | `references/05-skill-matching.md` |
| Architecture levels, rules vs skills, full Arch H template, propagation model | `references/06-context-arch-h.md` |
| NEVER/ALWAYS rules, retry budget, SendMessage vs re-spawn, stuck detection, worktree cleanup | `references/07-delegation-recovery.md` |
| Output style baseline, escape triggers, terse-first rules, when NOT to apply | `references/08-output-style.md` |

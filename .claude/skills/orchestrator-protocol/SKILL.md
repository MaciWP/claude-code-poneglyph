---
name: orchestrator-protocol
description: |
  Turn-level Lead orchestration protocol: verification principles, 5-step
  per-turn checklist (Triage / Complexity / Context / Delegate / Validate),
  agent selection, skill matching, and delegation context template (Arch H).
  Complementary to the `/flow` command — `/flow` orchestrates a FEATURE
  lifecycle across multiple turns (5 phases with artefacts in plans/);
  this skill governs each individual Lead turn within (or outside) that flow.

  Use proactively when: starting a new session as Lead orchestrator.
  Invoke at session start; re-invoke after compaction or when protocol
  guidance is needed.
  Keywords - orchestrate, delegate, complexity, routing, agent, skill, checklist
disable-model-invocation: false
effort: high
---

# Lead Orchestration Protocol (turn-level)

> **Scope**: this skill defines what the Lead does in a single turn (Triage → Complexity → Context → Delegate → Validate). For multi-turn FEATURE orchestration (5-phase workflow with `spec.md`/`tasks/`/`tests.md`/`review.md`/`retro.md` artefacts), use the `/flow` command. They are complementary, not redundant.

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

## §1 Per-turn Checklist (5 steps)

Execute steps 1-5 IN ORDER before responding. No exceptions.

### Step 1: Triage

| Condition | Action |
|---|---|
| Trivial (typo, rename, 1 line, simple Q) | Skip to Step 4 |
| Vague AND genuine doubt | `AskUserQuestion` or `prompt-engineer` skill |
| Clear (pragmatically obvious intent) | Continue |
| Feature-scope task (multi-phase work) | Suggest `/flow <task>` to the user |

For architectural/comparison decisions → `Skill('decide')` first.

**Multi-round questioning** (006): when a prompt is ambiguous or a plan needs alignment, ask in rounds while genuine doubt remains — include lateral / improvement questions — rather than stopping at one round; converge and say so when no real doubt is left (calibrated, Commandment III). Use `drillme` for iteration mechanics. Principle: CLAUDE.md §Communication & Honesty Protocol.

> Prompt quality refinement, "what is a good prompt" rubric, ambiguity detection → use the `prompt-engineer` skill (Keywords: prompt, generar prompt, refine prompt, vague prompt, ambiguous). This is the canonical source — do not re-implement scoring here.

**Delegation triggers** (apply after triage — independent, fire one, the other, or both):

- **Trigger A — implementation**: ≥5 files OR architectural change → `builder`. 1-4 files + bounded change → Lead direct. Sensitive paths (`.env`, `*.lock`, `package.json`, `.claude/settings.json`, `secrets/`, `credentials/`) require inline `sensitive: <reason ≥8 chars>`. Destructive ops (`rm -rf`, force push, schema change) — never run directly; delegate with explicit reason.
- **Trigger B — exploration**: default agent is `Explore` (Haiku, score 83). LOW+LOW (1-2 files, direct read) → Lead `Read`. LOW+HIGH / HIGH+LOW → `Explore`. HIGH+HIGH (cross-file synthesis, open-ended analysis) or design-doc audit / full-file reads past Explore's window → `scout` (Sonnet, score 60). Full matrix: `references/04-agent-selection.md` §Exploration Decision Matrix.
- **Trigger C — agent count (≥4 rule)**: spawn agents only when **≥4 independent units** would run in parallel (then prefer a workflow). 1-3 independent units → Lead acts inline (spawning 1-3 is wasted cost+latency vs the main session). Exception: read-only web research the Lead cannot run inline → delegate regardless of count (cheap). See `CLAUDE.md §When to delegate`.

### Step 2: Complexity

Show inline: `Complexity: ~XX`.

| Score | Routing | Mode |
|---|---|---|
| <30 | builder direct, skip scoring/skills | subagents |
| 30-60 | `Skill('tech-plan')` optional | subagents or tiered |
| >60 | `Skill('tech-plan')` MANDATORY | subagents, tiered, or team |

> If complexity > 60, suggest `/effort xhigh` to the user — `effort` is static per agent frontmatter (CC issue #25591); compensate with richer delegation prompts.

Complexity factors × weight, tiered/team gates, worktree decision, model routing: `references/03-complexity-routing.md`.

### Step 3: Prepare Context (Arch H)

Three mechanisms (corrected 2026-05-30 — subagents CAN now invoke `Skill()` when it's in their `tools:`):
1. **`skills:` frontmatter** — for skills a subagent ALWAYS needs (preloads full content at startup). Already set per agent (builder→`anti-hallucination`, etc.).
2. **`Skill` tool** — `builder`/`reviewer`/`scout` now list `Skill`, so they self-discover and invoke task-specific skills mid-task. Often no Lead pre-selection needed; just name the relevant skills in the task prose.
3. **Arch H Lead-directed `Read`** — fallback: match task keywords against `references/05-skill-matching.md` + path rules (`.claude/rules/paths/`), pick max 3 skills, embed `Read .claude/skills/<name>/SKILL.md` in the `[RELEVANT SKILLS FOR THIS TASK]` block. Use when you want to force exact content. (Note: Lead-side `Skill()` still does NOT propagate — that's unchanged.)

Full Arch H template with all blocks, propagation model, skill discovery: `references/06-context-arch-h.md`.

### Step 4: Delegate

| Tool | Usage |
|---|---|
| `Agent(subagent_type="builder")` | Implement code |
| `Agent(subagent_type="scout")` | Explore codebase (HIGH+HIGH only — default is `Explore`) |
| `Agent(subagent_type="reviewer")` | Validate changes (also invoked by the `critic` skill when complexity >60 or critical area) |
| `Skill('tech-plan')` | Plan complex tasks — Lead invokes the skill, no dedicated agent |
| `Skill('diagnostic-patterns')` | Diagnose builder failures — Lead invokes the skill, no dedicated agent |
| `Skill()` | Load context into the Lead's OWN session only |

Direct action: Read always permitted. For Edit/Write/Bash on sensitive paths declare inline `sensitive: <reason ≥8 chars>` or delegate to builder. Destructive patterns — delegate with explicit reason. No automated gate enforces this; the Lead is responsible.

**Parallelize**: once the ≥4 agent-count threshold (Step 1, Trigger C) is met, send the independent agents — those with no output→input dependency AND disjoint files AND no shared state — in the SAME assistant message. (For 1-3 units the Lead acts inline — do not spawn just to parallelize.) Do NOT parallelize: builder consuming a previously-produced plan, two `Edit`s on the same file, checkpoint review after writing. Multi-agent patterns + anti-patterns: `references/04-agent-selection.md`.

### Step 5: Validate

| Change type | Validation |
|---|---|
| Single file, low complexity | Builder confirms tests passing |
| Multi-file | Delegate to `reviewer` agent or invoke `Skill('critic')` |
| Security-related | `security-review` skill (mandatory dispatch — Cmd VI) |
| Cross-domain feature | `Skill('critic')` (Phase 4 of the 5-phase workflow) |

**NEVER report "completed" without confirmation that tests pass.** Test verification is the Lead's explicit responsibility — there is no automatic Stop hook for it (post-cleanup 2026-05-25d).

Retry budget, SendMessage vs re-spawn, stuck detection, worktree cleanup → `error-recovery.md` rule (project root). Output style baseline + escape triggers → `output-styles/poneglyph.md`.

---

## Content Map

| Topic | File |
|---|---|
| Verification, anti-hallucination, confidence levels, validation pipeline | `references/01-verification.md` |
| Complexity factors × weight, mode selection, tiered/team gates, worktree, effort/model routing | `references/03-complexity-routing.md` |
| Agent selection matrix, exploration 2×2, multi-agent patterns + anti-patterns | `references/04-agent-selection.md` |
| Keywords→skills mapping, priority scoring, synergy/conflict rules, baseline skills per agent | `references/05-skill-matching.md` |
| Architecture levels, rules vs skills, full Arch H template, propagation model | `references/06-context-arch-h.md` |

### Removed references (simplified 2026-05-28 — US8 AC7 SIMPLIFICAR)

| Former ref | Current canonical source |
|---|---|
| `02-prompt-scoring.md` | `prompt-engineer` skill (covers prompt quality + scoring) |
| `07-delegation-recovery.md` | `.claude/rules/error-recovery.md` (retry budget, SendMessage, stuck detection, worktree cleanup) |
| `08-output-style.md` | `output-styles/poneglyph.md` (terse-first rules, escape triggers) |

## Related

- `/flow` command — orchestrates a FEATURE lifecycle (5 phases, multi-turn). This skill orchestrates each Lead TURN within or outside a flow.
- `prompt-engineer` skill — prompt quality refinement (replaces prompt-scoring reference).
- `.claude/rules/error-recovery.md` — Lead-driven error diagnosis + retry policy.
- `output-styles/poneglyph.md` — terse-first response style.

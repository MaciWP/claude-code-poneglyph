# Architecture H — Lead-Directed Skill Reads

A pattern for propagating task-specific skill content to default Claude Code subagents without per-project agent duplication.

Validated empirically on 2026-04-10 in the Poneglyph orchestration system. As of writing, this pattern has no public name or canonical documentation in the broader Claude Code community.

## 1. Problem statement

Claude Code offers three plausible mechanisms for getting skill content into a subagent. All three have limitations:

| Mechanism | What it does | Limitation |
|---|---|---|
| **Frontmatter `skills:` pre-injection** | Agent definition declares a static list; full `SKILL.md` bodies are pre-loaded at spawn via `<command-message>` wrappers. | **All-or-nothing.** A project-scoped agent must declare its skill list statically; the list cannot vary per task. Every delegation pays the full token cost. |
| **Lead `Skill()` invocation** | Loads skill content into the main orchestrator's working context. | **Does not propagate to subagents.** Subagents spawn in a fresh context. Anything the Lead loaded via `Skill()` stays with the Lead. |
| **Subagent dynamic `Skill()`** | The subagent calls `Skill()` from inside its own turn. | **The `Skill` tool is not in the default subagent allowlist.** `builder`, `reviewer`, `scout`, `error-analyzer`, `planner`, `architect` — none of them have `Skill` in `tools:`. The tool simply does not exist in their environment. |

**The gap**: there is no documented way to give a default subagent **task-specific** skill content without either (a) creating per-project custom agents with bespoke frontmatter or (b) pre-declaring every skill the agent might ever need.

## 2. Why this matters

With only frontmatter injection available, any non-trivial project hits the same wall:

- **Context bloat per delegation.** A project reviewer with 8 declared Django skills pays for all 8 even when reviewing a migration file where only 2 are relevant.
- **Per-project agent duplication.** Each project ends up with its own `project-builder`, `project-reviewer`, `project-scout`, each a fork that diverges from the global baseline.
- **Fragmented agent expertise.** Every per-project agent has its own `.claude/agent-memory/{agent}/MEMORY.md`. Insights learned in project A never reach the agent working on project B. There is no pooled, cross-project expertise.

The frontmatter path scales poorly. You want task-specific skill loading on the global default agents themselves.

## 3. The pattern: Architecture H

**Name**: Lead-Directed Skill Reads. Shorthand: Arch H.

**Core idea**: every default subagent has `Read` in its tools allowlist. Use it. Instead of trying to propagate skill content through `Skill()`, the Lead writes explicit `Read .claude/skills/<name>/SKILL.md` instructions at the top of the delegation prompt. The subagent's first actions are those Reads. The skill content enters the subagent's working context through the same mechanism as any other file, and the subagent proceeds with the task citing the loaded content.

This turns `Read` into a skill-loading primitive. No new tool, no new agent, no frontmatter churn.

| Aspect | Broken approach | Arch H |
|---|---|---|
| Tool required in subagent | `Skill` (missing) | `Read` (always present) |
| Skill list | Fixed at spawn | Chosen per task by Lead |
| Who decides | Agent author | Lead, based on task context |
| Scope | Per-project agent | Global default agent |

## 4. Mechanism (step by step)

1. User submits a prompt that mentions file paths.
2. The `memory-inject.ts` `UserPromptSubmit` hook matches those paths against `.claude/rules/paths/*.md` globs, extracts the relevant skill names, and emits a `## Path-Based Skills (for delegation)` section containing full `Read` instructions inside `hookSpecificOutput.additionalContext`.
3. The Lead receives the suggestions in its own context alongside the user prompt.
4. The Lead picks the appropriate subagent and builds the delegation prompt using the template below. Empty blocks are omitted entirely rather than left as empty headers.
5. The subagent's first tool calls are the `Read`s. Skill content enters its working context.
6. The subagent proceeds with the task, citing loaded skill content as warranted, and returns its deliverable plus a `### Memory Insights` block.

### Delegation template (verbatim from `.claude/rules/lead-orchestrator.md`)

```
[ACCUMULATED MEMORY - {agent}]
{content of MEMORY.md, last 3K tokens}

[RELEVANT SKILLS FOR THIS TASK]
Before starting, your first actions must be to Read these skill files for context.
After loading them, proceed with the task.
- Read .claude/skills/<skill-1>/SKILL.md
- Read .claude/skills/<skill-2>/SKILL.md
- Read .claude/skills/<skill-3>/SKILL.md

[TASK]
{task instructions}

[MEMORY OUTPUT]
When finished, include "### Memory Insights" with 1-5 reusable insights discovered during this task.
```

| Rule | Detail |
|---|---|
| Max skills | 3 per delegation (avoid token bloat) |
| Source of truth | Hook-emitted suggestions > manual keyword match > omit |
| `Skill()` by the Lead | Still valid — loads into the Lead's own session, does NOT propagate |
| Empty blocks | Omit the header entirely |

## 5. Empirical validation

Arch H was not adopted on theory. It was tested.

| Test | What it verified | Result |
|---|---|---|
| **Test 1 — Subagent tool allowlist (initial)** | Whether default reviewer had `Skill` in its tools. | Initially read as YES based on surface inspection. Later refuted. |
| **Test 5 — Real introspection** | Actual tools available to default subagents at runtime. | Default subagents expose `Read`, `Grep`, `Glob`, `Bash` — **not** `Skill`. Invalidated any prompt that told a subagent to call `Skill()`. |
| **Test 7 — First Arch H validation** | Whether a reviewer, told to `Read .claude/skills/django-api/SKILL.md` plus two others in its delegation prompt, would load and use the content. | Reviewer Read all three files as its first actions and cited `django-api` rules verbatim in the review output. Parity with frontmatter-based project agents, without the frontmatter. |
| **Test P5 — Real-world review under Arch H** | Whether Arch H adds real value beyond baseline Django knowledge on a production file. | Reviewer Read 4 skills (`django-architecture`, `django-query-optimizer`, `django-review-lessons`, `code-style-enforcer`), then reviewed a 172-line Django model file. Output: 5 majors + 3 minors, each tied to a specific skill rule cited verbatim. The reviewer explicitly noted: *"Baseline Django knowledge alone would have flagged maybe 2 of 8 issues."* |

Test P5 is the load-bearing evidence: skills loaded via Arch H measurably expanded what the reviewer caught, and the reviewer itself attributed the delta to the loaded content.

## 6. Trade-offs vs frontmatter and Lead `Skill()`

| Aspect | Frontmatter `skills:` | Lead `Skill()` | Arch H (Read-directed) |
|---|---|---|---|
| Granularity | All-or-nothing per agent | Per-Lead-turn, doesn't propagate | Per-task, per-delegation |
| Duplication | Per-project agents | None, but Lead-only | None — global agents reused |
| Memory | Fragmented per project | N/A | Pooled in global `MEMORY.md` |
| Token cost | Upfront, always | Lead only | Lazy, scoped to task |
| Latency | Zero | Zero | +1-3 Read calls (~1-2s) |
| Tool required | Frontmatter processor | `Skill` (Lead has it) | `Read` (always in allowlist) |
| Works for | Agents with frontmatter | Only the Lead | Any default subagent |

Arch H's only real cost is the Read latency. Everything else is a win.

## 7. When to use

- **Use Arch H** for task-specific skill content, multi-project orchestration, and whenever you want pooled cross-project expertise on global default agents.
- **Don't bother** for trivial tasks where even a single Read is net overhead (complexity < 15, single-file typo fixes, etc.).
- **Don't use** when the subagent doesn't have `Read` in its tools allowlist (rare — essentially custom agents with an intentionally restricted toolset).
- **Frontmatter is still correct** for baseline skills that a role always needs regardless of task (e.g., reviewer's permanent `code-quality` + `anti-hallucination`). Use frontmatter for the floor, Arch H for the task-specific ceiling.

## 8. The "entry + references" sub-pattern

For skills mixing generic content with project-specific tacit knowledge, extend Arch H inside a single skill:

```
.claude/skills/<name>/
├── SKILL.md              # Entry: <=200 lines, generic content + pointer table
└── references/
    ├── project-specific-A.md
    ├── project-specific-B.md
    └── deep-dive-C.md
```

The `SKILL.md` entry ends with a `Deep references (Read on demand)` table mapping `When → Read file`. The subagent always reads `SKILL.md` first (loaded by the delegation prompt), then Reads only the references that apply to the task at hand. This is Arch H recursively applied: the Lead directs the subagent to read the entry; the entry directs the subagent to read specific references.

Concrete example: `.claude/skills/django-api/` ships a lean `SKILL.md` plus ~5 references for binora-specific patterns (frontend_permissions integration, drf-spectacular schema extensions, etc.). The base skill loads in every Django delegation; the references only load when the task matches.

## 9. Implementation reference

Canonical files in this repo:

| Component | Path |
|---|---|
| Hook that emits skill suggestions | `.claude/hooks/memory-inject.ts` (`extractPathSkills` function) |
| Path-to-skill rules | `.claude/rules/paths/*.md` (e.g., `django.md`, `hooks.md`, `orchestration.md`) |
| Delegation template (Memory + Skill Injection) | `.claude/rules/lead-orchestrator.md` (section "Memory + Skill Injection When Delegating (Arch H: Lead-Directed Skill Reads)") |
| Canonical propagation model | `.claude/rules/context-management.md` (section "Skill Propagation Model (Empirically Verified)") |

Example path rule (`.claude/rules/paths/django.md` frontmatter):

```yaml
globs:
  - '**/apps/**/*.py'
  - '**/*/models.py'
  - '**/*/views.py'
  # ...
skills:
  - django-api
  - django-architecture
  - django-query-optimizer
  - code-style-enforcer
```

When a user prompt mentions any matching path, `memory-inject.ts` emits Read instructions for the listed skills into the Lead's context, and the Lead copies them into the delegation prompt.

## 10. Community context

State of the art in the broader Claude Code community as of 2026-04-10:

- **No public name or canonical write-up** of "Lead-Directed Skill Reads" as a pattern. The mechanism — Read-based skill loading from inside a subagent — is mechanically possible with stock Claude Code but is not identified, named, or recommended in any community resource surveyed.
- **Closest related**: GitHub issue `anthropics/claude-code#32910` confirms that Read-based skill discovery works mechanically, but does not name the pattern, discuss delegation-prompt injection, or contrast it with frontmatter.
- **Related work inspected**: `jarrodwatts/claude-code-config`, `WorldFlowAI/everything-claude-code`, Mario Ottmann's Claude Code customization guide. None of them use Lead-directed Reads as an explicit alternative to frontmatter `skills:`.

To our knowledge, Poneglyph is the first codebase to name Arch H, ship a hook-driven implementation, and validate it empirically against a real review task (Test P5).

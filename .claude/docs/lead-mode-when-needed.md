# Lead Mode — When and How to Activate

Reference doc (opt-in). Lead Mode is NOT bootstrapped by default — activate it explicitly when the task warrants orchestration.

## Activation

Set `CLAUDE_LEAD_MODE=true` in `.claude/settings.json` env block to enable Lead Mode for sessions in this project. Without it, Claude acts as a single agent without forced orchestration ceremony.

```jsonc
{
  "env": {
    "CLAUDE_LEAD_MODE": "true"
  }
}
```

When active:
- The Lead can invoke `Skill("orchestrator-protocol")` to load the full protocol
- No automated gate — the Lead is responsible for declaring `sensitive: <reason>` on sensitive paths and avoiding destructive ops directly

## When to activate

Activate Lead Mode for projects/sessions that benefit from orchestration:

- Multiple parallel domains with genuinely independent work
- Architectural changes touching ≥5 files where planning matters
- Long-running multi-step tasks where context preservation across delegations beats single-agent execution
- Worktree-isolated parallel feature development

For 1-4 files, bounded changes, single-domain tasks → don't bother. Direct execution is faster and cheaper.

## When you need orchestration but Lead Mode is off

Invoke the protocol skill ad-hoc:

```
Skill("orchestrator-protocol")
```

This loads complexity routing, delegation triggers, Arch H template, agent selection, and error recovery into the active context — without forcing it on every session.

## Plan mode trigger (planner-protocol)

Invoke `Skill("planner-protocol")` as your FIRST action whenever you enter plan mode:

- **Primary trigger**: a system-reminder containing `Plan mode is active`. Invoke the skill immediately before any other action.
- **Secondary trigger**: user explicitly invokes `/planner` or asks to plan/decompose/roadmap a non-trivial task.
- **Skip**: trivial Q&A or pure conversation that does not require planning.
- **Re-invoke**: after context compaction, or when protocol guidance is needed.

```
Skill("planner-protocol")
```

This loads the adaptive planning protocol — Discovery, Research, Gap Analysis, Task Classification, Execution Roadmap with DAGs, TDD, Validation — into your active context.

### Level triage is automatic

The skill applies its own level triage (Quick / Standard / Full) based on complexity and scope:

| Level | When | Cost target |
|---|---|---|
| **Quick** | Complexity <30, clear scope, 1-2 files | ~3-5 min |
| **Standard** (default) | Complexity 30-60, some ambiguity | ~10 min |
| **Full** | Complexity >60, multi-domain, plan mode with architectural risk | ~20-30 min |

Force a level via flag: `--quick`, `--standard`, `--full` if needed.

## Delegation Decision Triggers (when Lead Mode is active)

### Trigger A — Delegate implementation

Default-allow philosophy: the Lead acts freely except on real danger signals. No automated gate enforces this — caution is the Lead's responsibility.

| Condition | Action |
|-----------|--------|
| ≥5 files to modify | Delegate to `builder` (preceded by `Skill('planner-protocol')` if complexity >60) |
| Architectural change (cross-module, new interface, major refactor) | Invoke `Skill('planner-protocol')` then delegate to `builder` |
| 1-4 files, bounded change | Lead acts directly — no declaration required |
| Sensitive path (`.env`, `*.lock`, `package.json`, `.claude/settings.json`, `secrets/`, `credentials/`) | Declare inline `sensitive: <reason ≥8 chars>` or delegate to the builder |
| Destructive/irreversible operation (`rm -rf`, force push, db migration, schema change) | Never run directly; delegate with a clear reason or escalate to user |

### Trigger B — Delegate exploration

Default exploration agent: `Explore` (built-in, Haiku, fast & cheap). Reach for the custom `scout` (Sonnet, ~5× cost) only when Explore's limits would actually hurt the task.

| Volume / Complexity | Action |
|-----------------------|--------|
| LOW + LOW (1-2 files, direct read) | Lead `Read` directly |
| LOW + HIGH (1-2 files, requires LSP/semantics) | `Explore` (default); `scout` only if full-file synthesis needed |
| HIGH + LOW (≥3 files, bulk read without reasoning) | `Explore` — best fit |
| HIGH + HIGH (≥3 files, cross-file synthesis / open-ended analysis) | `scout` (Sonnet) |
| Design-doc audit, cross-file consistency check, full-file analysis past Explore's window | `scout` (Sonnet) |

The discriminator is read window + synthesis depth, not WebSearch availability (both have it).

### Combination

The two triggers are **independent**. A task can fire A without firing B (Lead has context, needs to write), or fire B without A (needs exploration, no change to implement). Typically both fire — first exploration, then implementation.

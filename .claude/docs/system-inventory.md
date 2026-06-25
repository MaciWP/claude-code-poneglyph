# System inventory & operational detail (evicted from CLAUDE.md — feature 017)

On-demand reference. CLAUDE.md keeps only always-needed behavior; everything here is data, history or detail recoverable with a Read. Last full update: 2026-06-11 (polish & prune pass — dead-weight deletions, plans archive executed, evals/scripts added).

## Sync working model (full detail)

The intended normal case is working in **another** project while poneglyph runs underneath through `~/.claude/`. Install once per machine:

```bash
bun .claude/commands/sync-claude.ts --execute --backup --force
```

- Links `skills/commands/rules/docs/hooks/output-styles` into `~/.claude/` (junctions on Windows — no admin; symlinks on macOS/Linux) and regenerates `~/.claude/settings.json` = `settings.json` (committed base) deep-merged with `settings.machine.json` (gitignored, per-machine).
- **macOS**: also create `.claude/settings.machine.json` carrying that machine's `env.PATH` — the GUI app launches with a minimal PATH, so linking alone leaves hooks/statusline broken; the PATH overlay fixes it (separate cause from linking).
- **Duplicates only inside this repo**: the global (`~/.claude/skills`, link → repo) and the project (`./.claude/skills`, real) are the same files via two paths. Harmless for skills/commands (dedupe by name); but hooks (`security-gate`, `code-validator`) are declared in BOTH levels, so a maintenance session in this repo may **double-fire** them. Other projects never see this.
- Settings load at session start → a fresh sync takes effect on the NEXT session.
- **Windows**: `CLAUDE.md` is **copied**, not linked (junctions can't link files) → re-run the sync after editing it or the global copy goes stale. On macOS it is a symlink (verified 2026-06-10).

## Entry points → how each routes to the workflow & skills

Poneglyph has ONE workflow (the 5 phases + Lead turn flow); what differs is how you enter it. Skill activation is **layered** and the entry point decides which layers fire:

| Entry point | What it is | Phase routing | Skill activation |
|---|---|---|---|
| **Plain prompt** (`haz X`) | Normal turn | Lead triages complexity → invokes phase skills / `/flow` as needed | `skill-activation.ts` injects `Skill()` on keyword match **+** Lead self-matches via `orchestrator-protocol §05` on non-trivial work |
| **`/flow <task>`** | The **router** — feature lifecycle orchestrator | Deterministic: triages mode → runs phases 1-5 with hard gates, **invoking each phase skill explicitly** | Wired by `/flow` itself (phase→skill is hard-coded in the command); hook skips `/flow` (no double-routing) |
| **`/goal <condition>`** | Built-in **persistence loop** (Stop hook) — keeps the Lead working until the condition holds. NOT a router | None by itself — the Lead routes each turn via the always-loaded CLAUDE.md core | Hook skips it (like every slash command). `/goal` runs as the **Lead**, not a fresh-context agent: it already has the always-loaded routing core and can invoke any `Skill()` itself — it needs no injected hint. Whether the Lead *actually* loads the relevant skill on a work turn is a discretionary call (no enforcement); for guaranteed skill use, wrap the work in `/flow` |
| **`/role <name>`** | Persona-framing over existing skills | Composes skills for the role; Lead still triages | Hook skips it (role self-composes); Lead matches within the persona |

**The honest answer to "siempre activar las skills":** activation is layered:
1. **Routing core is always-loaded** (CLAUDE.md §Lead Orchestrator Mode + §Skill routing + §5-phase model). The Lead therefore triages and routes on EVERY turn — including every `/goal` loop turn — without any hook. This is the real "always-on" layer.
2. **`/flow` → deterministic phase→skill wiring** (each phase invokes its skill explicitly). The strongest guarantee, for feature-shaped work.
3. **Keyword hook → on-demand skill acceleration** — best-effort, plain prompts only (skips slash commands); surfaces a specific skill (`security-review`, `tdd-design`…) earlier than the Lead might. NOT a guarantee (Spanish/novel phrasings miss; and the Lead may ignore the hint).

**The real gap (named honestly):** skill *use* by the Lead is discretionary — the hook only nudges, CLAUDE.md only says "match skills before build", and the Lead can (and does) skip both on a given turn. On conversational/meta turns skipping is correct (loading a skill would be ceremony); the concern is genuine work turns. **The only deterministic enforcement of skill use is `/flow`** (each phase invokes its skill explicitly). So: for a real feature, wrap it in `/flow` even from inside a `/goal` loop. Don't try to force skill use via hooks/always-loaded — that's the regression pattern (memory: [always-loaded-vs-ondemand-cost]).

## Lead turn flow (was "Mandatory flow" mermaid)

```mermaid
graph TD
    U[User prompt] --> S[Score prompt]
    S -->|doubt| AQ[AskUserQuestion or Skill prompt-engineer]
    AQ --> S
    S -->|clear| C[Calculate complexity]
    C -->|< 30| SK[Pick relevant skills via path hints / keywords]
    C -->|30-60| P1[Skill tech-plan optional]
    C -->|> 60| P2[Skill tech-plan mandatory]
    P1 & P2 --> SK
    SK --> B[build inline -- Skill build]
    B --> R[critic checkpoint -- Skill critic]
    R -->|APPROVED| D[Done]
    R -->|NEEDS_CHANGES| B
    B -->|Error| DG[Lead diagnoses with Skill diagnostic-patterns]
    DG --> B
```

Canonical per-turn checklist: `orchestrator-protocol` skill §1.

## Execution modes

| Mode | When | Cost |
|------|------|------|
| **Inline** (default) | ALL build/write work, any size — delegation doctrine (orchestrator-protocol §P8) | 1x |
| **Workflow read-only fan-out** | ≥4 independent read-only units (research sweeps, decision-review panels) | scales w/ agent count |
| **Workflow write fan-out** | explicit user opt-in only ("ultracode" / direct ask; "workflow" keyword no longer triggers since CC 2.1.160); per-unit `isolation: 'worktree'` on collision | scales |
| **Tiered** | Complexity 45-60 with 2-3 domains sharing interfaces — contracts inline via tech-plan Mode B | ~2x |
| **Team agents** (experimental) | Complexity >60, 3+ independent domains, interface negotiation, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | 3-7x |

> **Background sessions / agent-view** (`claude agents`, CC ≥2.1.139 — version-specific, verify): orthogonal axis — runs whole **sessions** in the background with a dashboard for running/blocked/done. `claude --bg` / `←←` to background; `/resume` lists them. Operational tool, not a per-turn routing mode.

## Planner adaptive levels (tech-plan)

| Level | When | Refs loaded | Target cost |
|------|------|-------------|-------------|
| **Quick** | complexity <30 or clear scope (1-2 files, no external research) | ≤2 | ~3-5 min |
| **Standard** (default) | complexity 30-60 or some ambiguity about dependencies | 3-5 | ~10 min |
| **Full** | complexity >60, multi-domain, plan mode with architectural risk | all | ~20-30 min |

Escalation: Quick → Standard on uncertainty → Full on multi-domain/architectural risk. Level declared in the first line of planner output.

## /flow adaptation per mode

| Mode | Phases executed | When |
|---|---|---|
| `minimal` | Phase 3 direct + Phase 4 light | trivial task, 1-2 files, no design decisions |
| `standard` (default) | All 5 phases, drillme normal | feature 2-5 files OR single domain |
| `full` | All 5 phases + decision-stress-test in Phase 2 + fresh-context reviewer (critical-area focus; panels = decisions only, feature 019) in Phase 4 + Commandments forensics in Phase 5 | architectural / multi-domain / auth-payments-security |

## Skill loading into a Workflow agent (3 mechanisms)

1. **`skills:` frontmatter** preloads full SKILL.md at spawn — for a custom `agentType` that ALWAYS needs a skill.
2. **`Skill` tool** — an agent whose `tools:` include `Skill` self-invokes task-specific skills mid-task (CC ≥2.1.133 — verified in `.claude/plans/_research-skill-activation-2026-06-09.md`). Name the relevant skills in the task prose.
3. **Arch H — Lead-Directed Skill Reads** (fallback): embed up to 3 `Read .claude/skills/<name>/SKILL.md` instructions in the `[RELEVANT SKILLS FOR THIS TASK]` block. Lead-side `Skill()` does NOT propagate to spawned agents.

Full template and propagation model: `orchestrator-protocol/references/06-context-arch-h.md`.

## Key rules mapping (historical — old rule → current location)

| Old rule | Current location |
|---|---|
| `lead-orchestrator.md` | `.claude/skills/orchestrator-protocol/SKILL.md` |
| `orchestration-checklist.md` | `orchestrator-protocol/references/01-verification.md` |
| `prompt-scoring.md` | `prompt-engineer` skill (post-2026-05-28) |
| `complexity-routing.md` | `orchestrator-protocol/references/03-complexity-routing.md` |
| `agent-selection.md` | `orchestrator-protocol/references/04-agent-selection.md` |
| `context-management.md` | `orchestrator-protocol/references/06-context-arch-h.md` |
| `delegation-recovery.md` | `.claude/rules/error-recovery.md` |
| `output-style baseline` | `.claude/output-styles/poneglyph.md` |

## When to use rules vs skills (project level)

| Content type | Mechanism | Why |
|---|---|---|
| **Constraint** — violation blocks merge, must ALWAYS be visible | **Rule** (always-on) | e.g., "features cannot import from other features" |
| **Knowledge/guidance** — useful when relevant, not every prompt | **Skill** (on-demand) | e.g., naming conventions, function design patterns |

Test: "does the agent need this in EVERY prompt?" — no → skill.

## When to use a command vs a skill (same layer, different trigger)

**Default to a skill.** Reach for a command only for (a) a script entrypoint (`sync-claude.ts`) or (b) a pure prompt-macro that orchestrates skills with `$ARGUMENTS`/`allowed-tools` (`flow`, `role`). Command = user invokes `/x [args]` explicitly; skill = model auto-invokes on keyword/description match (no `$ARGUMENTS`). A command may invoke skills; a skill never needs `$ARGUMENTS`. Live commands: `flow`, `role`, `sync-claude` — everything else is a skill.

## Component inventory

| Component | Audit baseline (early 2026) | Post-cleanup (2026-05-28) | Current | Detail |
|---|---|---|---|---|
| Agents | 7 + 1 meta | 3 | **0 custom** | builder/reviewer/scout cut in feature 008; work runs inline (delegation doctrine), read-only fan-out via Workflow/`Explore`. The ONE sanctioned single-agent dispatch is critic's fresh-context reviewer (P1 exception, feature 019) — ad-hoc, no agent file |
| Skills | 28 | 14 | **22** | 6 phase skills + `drillme` + `html-report` (003) + `best-of-n` (019, pilot); `planner-protocol` migrated-and-cut into `tech-plan/references/`; `skill-advisor` cut — its turn-level routing now lives in `skill-activation.ts` + orchestrator-protocol skill matching |
| Hooks | 15+ | 6 | **7 registered** | `auto-approve`, `post-compact`, `security-gate`, `validators/code-validator`, `skill-activation`, `instructions-loaded`, `learning-inbox` (017/US11-12; self-match filter 019) |
| Slash commands | 10 | 4 | **3** | `flow`, `sync-claude`, `role` (decide/explain-changes were thin command wrappers → pruned; they remain as skills) |
| Rules | 7 | 2 + paths/ | **2 + paths/** | `error-recovery.md`, `test-policy.md` + `paths/{hooks,orchestration}.md` |
| Output-styles | 1 (caveman) | 1 | **1 (poneglyph)** | es-ES natural register since feature 017/US3 |

## Security posture (personal setup — deliberate)

`defaultMode: auto` with `skipDangerousModePermissionPrompt` + `skipAutoPermissionPrompt: true` is a **deliberately relaxed** permission flow, appropriate for a single-user personal config (NOT a SaaS — CLAUDE.md §NOT). The safety net is layered: (1) `permissions.deny` (secrets, `rm -rf /`, `curl|bash`); (2) `autoMode.hard_deny` (`rm -rf .claude`, force push…); (3) the `auto-approve.ts` hook block-list (`rm`, `git push`/`reset --hard`/`clean`/`branch -D`/`rebase -i`); (4) CC 2.1.183 native blocking of destructive git/IaC in auto mode. `auto-approve.ts` and `autoMode.hard_deny` are kept in sync **manually** — edit one, update the other (the hook header documents this).

## Directory map (.claude/)

| Dir | Contents | Status |
|---|---|---|
| `skills/` (22), `commands/` (5), `rules/`, `hooks/`, `output-styles/`, `plans/` | Core system | documented above |
| `docs/` | This file + `research-rigor.md` (`arch-h-*` and `lead-mode-*` deleted 2026-06-11 — superseded by `orchestrator-protocol/references/06` and the `CLAUDE_LEAD_MODE` note above) | on-demand references |
| `workflows/` | `ultracode-audit.js` — saved Workflow script (worked example of find→verify pipeline) | live |
| `audits/` | Ad-hoc audit outputs (005, 009) | archive-like |
| `evals/` | Golden-prompt regression harness (019): deterministic graders + runner + 18 real-failure cases. Tracked, NOT synced. Run per meta-config change | live |
| `scripts/` | `flow-state.ts` — typed state.json/frontmatter mutations for /flow. Tracked, NOT synced | live |
| `learned/` | Runtime per-machine (gitignored) EXCEPT `best-of-n-log.md` (versioned pilot evidence, 019) | runtime |
| `ccstatusline/` | Statusline module wired via settings (synced to `~/.config/ccstatusline/`) | live |
| `config/` | `cost-budget.json` — phantom config nothing read | **deleted 2026-06-11** |
| `data/`, `agent-memory/` | Telemetry remnants / empty dir | **deleted 2026-06-10 (017/US5)** |
| `plans/_archive/` | Closed/abandoned plans (gitignored, on disk only). 017 + 019 archived 2026-06-11; 020 + 023 archived 2026-06-23; **001 + 018 + 021 + 022 archived 2026-06-24** after relocating their last live-referenced files (MIGRAR-Y-CUT): 001 auxiliary matrix → `docs/auxiliary-skills-matrix.md`; 018 decision-memo-W1 → `skills/best-of-n/references/`; 021 decision-memo → `skills/orchestrator-protocol/references/09-loops-analysis-source.md`; 022 decision-memo → `skills/project-onboard/references/graph-tooling-decision.md`. `_archive/` now has **zero functional dependents** — only historical prose cites archived plans by name. Active `plans/` holds only in-flight features + `templates/` + the two `_research-*` files | archive since 017/US6 |

## MCP servers (session-connected) — decision 2026-06-10 (017/US8)

All five stay default-on (user-ratified): **context7** (plugin, settings.json `enabledPlugins`), **claude-in-chrome** (extension), **Atlassian**, **binOra Desarrollo**, **binOra Producción** (claude.ai connectors — managed in the claude.ai UI, not in settings). Context cost is mitigated by ToolSearch deferred loading. Revisit if a server's tool list bloats context again.

Schema findings (017/US8, verified against schemastore 2026-06-10): `minimumVersion` EXISTS (version gate set to 2.1.160); `requiredMinimumVersion` and `fallbackModel` DO NOT EXIST — no fallback-model cascade is possible in settings.json (closest is `availableModels`, which restricts selection rather than degrading gracefully). Recorded per AC1; nothing invented.

Activation/observability hooks (017/US12, event verified in official hooks docs 2026-06-10): `skill-activation.ts` (UserPromptSubmit) injects explicit `Skill(<name>)` instructions on keyword match — the deterministic activation layer, best-effort per issue #17277. `instructions-loaded.ts` (InstructionsLoaded, async) logs every CLAUDE.md/rules load to `.claude/learned/instructions-loaded.log` — grep it to verify load layers instead of assuming.

`CLAUDE_LEAD_MODE` env var (set `"true"` in `settings.json`): consumed by `post-compact.ts:20-22` to re-inject the "Lead Orchestrator active" header after compaction. That is its only consumer (verified 2026-06-11; the old `docs/lead-mode-when-needed.md` describing an opt-in mechanism was deleted — the var is permanently on).

## History

- **5-phase workflow refactor (W1-W5, 2026-05-28)**: W1 plan structure + 8 templates · W2 7 new skills (6 phase + drillme; planner-protocol MIGRATE-AND-CUT) · W3 `/flow` + orchestrator-protocol SIMPLIFY · W4 CLAUDE.md update · W5 dogfooding + retro. Detail archived under `.claude/plans/_archive/001-poneglyph-5phase-workflow/` (historical; the live auxiliary matrix now lives at `docs/auxiliary-skills-matrix.md`).
- **Feature 006 (2026-06-08)**: always-on honesty layer + base role senior engineer-advisor + `/role` (13 roles).
- **Feature 008 (2026-06-05/09)**: builder/reviewer/scout agents cut; spawn decision tree canonical in orchestrator-protocol. The W2 KEEP-cond decisions for builder/reviewer were superseded here; `review-patterns` KEEP still holds.
- **Feature 012**: `skill-advisor` (turn-level propose→validate skill routing).
- **Feature 017 (2026-06-10, closed)**: inline-first delegation doctrine (evidence-based), es-ES natural style, this eviction, hygiene waves.
- **Feature 018 (2026-06-10, closed)**: evidence roadmap — 5 research waves, decision memos W1-W5, roadmap 019+.
- **Feature 019 (2026-06-10, closed, archived)**: quality gates — critic fresh-context reviewer (panel → decisions only), evals harness, best-of-n pilot.
- **Polish & prune (2026-06-11)**: dead-weight deletions (cost-budget, 2 docs, dead `skill-advisor` section in CLAUDE.md, 3 stale LINK_FOLDERS), plans archive policy executed, doctrine-sweep protocol (meta-create reference), failure→eval-case wiring in retro, flow-state helper.
- Audit trail: the 002 config audit (archived; sample render preserved at `.claude/skills/html-report/examples/sample-audit-report.md`) + audit 011.

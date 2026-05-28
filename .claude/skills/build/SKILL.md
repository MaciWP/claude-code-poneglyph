---
name: build
description: |
  Implement ONE approved HU (Phase 3 of the 5-phase workflow).
  Reads tasks/USX.md + tests.md/validations.md + state.json, identifies the next
  HU (or specific via /build US{id}), Globs/Greps ejemplos del proyecto for style,
  honors TDD-mode (red->green when forced or tdd: forced on the node; impl + suite
  verify when tdd-skip or optional). Invokes AskUserQuestion on concrete doubts
  (never improvises). Updates state.json on closure, reports next HU. For HUs
  involving >=5 files OR architectural change, delegates to `builder` agent for
  context isolation. Closes intra-HU drillme (4 questions) before declaring done.
  Use when: tasks/ approved + Phase 2.5 oracle approved + HU pending in state.json,
  "build", "implementa", "ejecuta", "construye", "implement HU", "next HU",
  after /tdd-design closes Phase 2.5, before /critic in Phase 4.
  Keywords - build, implement, implementa, ejecuta, construye, develop, code, write,
  red-green, TDD, HU, story, story-executor, fase-3, phase-3, next-HU
disable-model-invocation: false
argument-hint: "[US{id}]"
effort: medium
---

# Build (Phase 3)

Implements ONE HU at a time from an approved `tasks/` + Phase 2.5 oracle. Each HU closes red→green (or impl + suite verify when policy allows) before the next HU starts. **HU-atomic** — never opens two HUs in parallel.

## Underlying principle

> "Each HU closes intra-fase before the next one. Smallest diff that satisfies the AC + drillme." (Commandment III — simple by default; Commandment IV — blocking gates per HU)

Phase 3 is the only phase that touches production code. Every other phase is design or verification. The discipline here is **atomicity + honest test/validation closure + delegation only when context isolation is genuinely needed**.

## When to use

| Trigger | Example |
|---|---|
| `tasks/` approved + `tests.md`/`validations.md` approved + HUs pending in `state.json` | After `/tdd-design` closes Phase 2.5 |
| User invokes `/build` (next pending HU) or `/build US{id}` (specific HU) | Direct invocation |
| `tdd-design` skill closes and triggers Phase 3 invocation | Auto-chain from Phase 2.5 |

## When to skip

| Anti-trigger | Why |
|---|---|
| `tasks/` not yet approved (status `draft`) | Phase 2 first |
| Phase 2.5 oracle not approved (no `tests.md`/`validations.md`) | Phase 2.5 first — TDD-mode HUs need oracle BEFORE impl |
| All HUs in `state.json` already completed | Phase 4 (`/critic`) instead |
| Bug fix in trivial mode (no `tasks/` directory) | Direct edit by Lead — Phase 3 ceremony adds nothing |

## Workflow

### Step 1 — Read inputs

1. `Glob .claude/plans/*-*/tasks/index.md` — find active feature.
2. If multiple → pick the one whose `state.json.current_phase == 3` (or 2 → 3 transition pending); ask user if ambiguous.
3. Read in parallel:
   - `tasks/index.md` (DAG + tabla resumen)
   - `tasks/US{N}.md` for each HU pending in `state.json`
   - `tests.md` (TDD-mode HUs) and/or `validations.md` (validation-mode HUs) — at least one exists per Phase 2.5
   - `state.json` (current_phase, us_completed, us_pending)
   - `.claude/rules/test-policy.md` (project TDD policy)

### Step 2 — Identify HU to execute

| Invocation | Selection |
|---|---|
| `/build US{id}` | Execute that exact HU. If already completed in `state.json` → ask user (re-run? abort?). |
| `/build` (no arg) | First HU in `state.json.us_pending` whose `depends_on` are all in `state.json.us_completed`. If none → check if a previously failed HU is in `us_pending_blocked` and escalate. |

Read the chosen `tasks/US{N}.md` completely + its associated `T{N}.X` tests or validation block.

### Step 3 — Decide: direct execution vs delegate to `builder` agent

**AC7 criterion** (KEEP-conditional): the `builder` agent is invoked ONLY for HUs with context-isolation value. Otherwise the skill executes directly (Lead default-allow gate).

| HU characteristic | Mode | Reason |
|---|---|---|
| 1-4 files touched, bounded change | **Direct** (Lead in skill) | Default-allow gate covers it; delegation adds round-trip cost without isolation gain |
| ≥5 files touched | **Delegate to `builder`** | Standard delegation threshold from `bootstrap-lead.md` Trigger A — context isolation real |
| Architectural change declared in `tasks/US{N}.md` (`arch_change: true` or AC explicitly mentions structural refactor) | **Delegate to `builder`** | New patterns or cross-cutting structure → builder's focused context preserves main session quality |
| HU touches sensitive paths (`.env`, `*.lock`, `package.json`, `.claude/settings.json`, `secrets/`) | **Delegate to `builder`** OR Lead declares inline `sensitive: <reason ≥8 chars>` | CLAUDE.md sensitive-paths rule |
| HU is "create extension" (new skill/hook/rule/MCP/plugin/agent) | Lead invokes `meta-create` first; then direct OR delegate per file count | Meta-context requires `meta-create` consultation |

When delegating to `builder`, the prompt MUST include (per Arch H):
- HU id + AC verbatim from `tasks/US{N}.md`
- TDD-mode resolution + the relevant `T{N}.X` test or `US{N}` validation block
- `[RELEVANT SKILLS FOR THIS TASK]` block listing `Read .claude/skills/<aux>/SKILL.md` for auxiliaries (anti-hallucination always; lsp-operations if semantic nav needed; diagnostic-patterns if test failures expected; meta-create if HU is extension)
- `[RELEVANT MEMORY]` block injecting `.claude/agent-memory/builder/MEMORY.md` if it exists
- Target files explicit
- Style anchors (1-3 file paths to Glob/Read for project conventions)

### Step 4 — Glob/Grep ejemplos similares (style anchors)

Before any Edit/Write:

1. `Glob` patrón similar al output esperado (`.claude/skills/*/SKILL.md` for new skills, `.claude/hooks/*.ts` for new hooks, etc.).
2. `Read` 1-3 ejemplos cercanos en estilo y dominio.
3. `Grep` referencias a las funciones/módulos/patrones que la HU usará (`anti-hallucination`).

Anti-hallucination auxiliary fires here automatically; if it doesn't, the Lead runs Glob/Grep/LSP manually before claiming any path exists.

### Step 5 — Honor TDD-mode per HU

Read `tests.md` frontmatter `tdd_policy: <forced|adaptive|optional>` + per-node overrides (`tdd: forced`, `tdd-skip: <reason>`).

**Forced (or per-node `tdd: forced`)** — strict red→green:

```
1. Write the test file from T{N}.X spec.
2. Run it (`bun test <path>` or project equivalent).
3. Verify it FAILS with the predicted error (red). A pass before impl is a smell — STOP + confirm with Lead.
4. Implement minimal code in the IMPL files to pass the test.
5. Re-run the test. Verify it passes (green).
6. If new edge cases emerge → add tests in the SAME HU and iterate red→green within it. Do not push silently to next HU.
```

**`tdd-skip: <reason>`** — reason is binding; do not relitigate:

```
1. Implement the code directly.
2. Run the existing test suite as verification (`bun test ./.claude/hooks/` or project equivalent).
3. If the skip reason looks wrong on inspection (e.g., the change DOES have testable behavior), report it in Issues and let the Lead decide.
```

**Optional (`auxiliary` policy with no per-node override)** — status quo:

```
1. Implement.
2. Run suite as post-impl verification.
3. If suite reveals breakage in unrelated code → diagnose with `diagnostic-patterns` skill.
```

**Validation-mode HU** (markdown/skill/doc/config) — no `tests.md` entry, only `validations.md`:

```
1. Implement the markdown/config change.
2. Verify each of the 5 categories in validations.md (Pre/Post/Structural/Smoke/Cross).
3. Run `bun test ./.claude/hooks/` as smoke (poneglyph-specific — auxiliary policy).
4. If Structural assertion fails (e.g., missing frontmatter field) → fix before declaring HU done.
```

### Step 6 — AskUserQuestion on concrete doubts (NEVER improvise)

Triggers for `AskUserQuestion`:

| Trigger | Example |
|---|---|
| Interface ambiguous (function signature not specified in AC) | "AC says 'parse the config' but doesn't specify input format — JSON or YAML?" |
| Decision not in spec (path, naming, default value) | "Where should the cache live? `~/.claude/cache/` or `.claude/<project>/cache/`?" |
| Edge case not covered in AC or oracle | "What if the input array is empty? AC silent; assume `[]` returns or error?" |
| Conflict between AC and existing code style | "AC asks for `snake_case` but project uses `camelCase` everywhere. Honor AC or follow style?" |

NEVER guess. NEVER add features beyond the AC. If 2+ `AskUserQuestion` fires in a single HU → smell signal: the HU was poorly defined; flag in Issues for retro (Phase 5).

### Step 7 — Drillme intra-HU (4 questions)

Before declaring HU complete:

1. `[approach]` **Pattern ignored?** Is there a pattern in the project I'm ignoring? (Glob results inspected?)
2. `[approach]` **Duplication?** Does my implementation introduce duplication of an existing utility?
3. `[approach]` **Over-engineering?** Am I adding more than the AC strictly requires (abstractions, hooks, fallbacks for impossible states)?
4. `[approach]` **Naming consistent?** Are names (files, functions, variables) consistent with the rest of the codebase?

Coverage: 4/4 in the `[approach]` category — Phase 3 is implementation-focused; `[location]`/`[context]`/`[failure]` were covered in upstream phases. NOT padding with artificial questions.

> Skill-to-skill invocation is probabilistic. If `drillme` does not auto-fire and a real doubt blocks progress, the Lead invokes `/drillme "<concrete doubt — HU US{N}>"` manually before closing the HU.

### Step 8 — Update state.json AND `tasks/US{N}.md` frontmatter

Two updates per HU closure (both mandatory — Cmd IX observability + documental coherence):

**8a. Update `state.json`** after tests pass (or validations close):

```json
{
  "current_phase": 3,
  "us_completed": ["US1", "US2", "US{N}"],
  "us_pending": ["US{M}", "US{P}"],
  "us_history": [
    {
      "us": "US{N}",
      "completed_at": "2026-MM-DD",
      "tests_passed": true,
      "files_touched": ["path/a", "path/b"],
      "delegated_to_builder": false,
      "askuserquestion_count": 0
    }
  ]
}
```

If `state.json` does not exist yet (first HU of Phase 3) → create it with the schema declared in US8 (`/flow`). If schema undefined → use the minimal shape above.

**8b. Update `tasks/US{N}.md` frontmatter** — the closed HU's own document:

```diff
 ---
 us: US{N}
 ...
- status: approved
+ status: closed
+ closed: YYYY-MM-DD
+ implemented: YYYY-MM-DD  # if not present
 ---
```

Without this update, the US document remains in `status: approved` even though its code is delivered → documental incoherence at feature closure (Phase 5 retro catches this as a smell). The build skill is RESPONSIBLE for closing the US frontmatter the moment the HU passes its gate.

**Anti-pattern blocked**: closing a HU in `state.json` but leaving `tasks/US{N}.md status: approved` → forces Phase 5 retro to do residual cleanup + flag a Phase 3 process failure in lessons ❌.

### Step 9 — Verify (blocking gate per HU)

Before reporting HU completed:

- Tests pass: `bun test <relevant>` (or project equivalent) → 100% on touched files.
- Project full suite: `bun test ./.claude/hooks/` (or equivalent) → no regressions in unrelated code.
- Type check (if project has type checker): `tsc --noEmit` / `mypy` / `cargo check` / `go vet`.
- Lint (if configured).
- If ANY of the above fails → invoke `diagnostic-patterns` skill, retry per `error-recovery.md` budget. After 2 retries → escalate to user.

**Never report "completed" without tests passing** (Commandment IV).

### Step 10 — Report HU closure + next HU

Output to user:

```
✅ HU US{N} closed.
- Files: <list>
- Tests: <pass count>/<total>; red→green honored (or tdd-skip: <reason>; or validation closure)
- Delegated to builder: <yes|no> + reason
- AskUserQuestion fired: <count>
- state.json updated.
- tasks/US{N}.md frontmatter updated: status: closed + closed: YYYY-MM-DD

Next HU available: US{M} (depends_on satisfied)
  → /build US{M} para ejecutar
  → /build sin args para auto-seleccionar
  → /critic si todas las HUs cerradas (Phase 4)
```

If all HUs closed → flag `state.json.current_phase: 4` and report "Phase 3 complete. Hard gate 3->4 — review/critic pending."

## AC7 decision: `builder` agent — KEEP-conditional

| Option | Verdict | Reason |
|---|---|---|
| CUT (delete agent) | ✗ Rejected | Loses context-isolation capability for HUs ≥5 files; `.claude/agent-memory/builder/MEMORY.md` carries historical insights worth preserving |
| ABSORB (migrate body into this SKILL.md) | ✗ Rejected | Inline workflow in skill does NOT replicate sub-agent context isolation — that's the structural value of the agent primitive |
| **KEEP-conditional** | ✓ **Adopted** | Builder remains a sub-agent invoked ONLY by this skill (or by Lead default-allow gate) when HU ≥5 files OR architectural change. Criterion documented in Step 3. Audit: `.claude/agent-memory/builder/MEMORY.md` exists → historical context preserved |

**Effect**:
- `.claude/agents/builder.md` — kept as-is.
- `.claude/agent-memory/builder/MEMORY.md` — kept; injected in delegation prompts.
- This skill is the canonical caller; Lead may still invoke `builder` directly per `bootstrap-lead.md` Trigger A.
- Refs to `builder` agent in other docs (CLAUDE.md, rules) — no changes required.

## Auxiliary skills invoked

> Canonical matrix in `.claude/plans/001-poneglyph-5phase-workflow/tasks/index.md §Auxiliary skills matrix`. Row below is the literal subset that applies to this Phase 3 skill.

| Auxiliary skill | When this skill invokes it | Fallback if skill->skill fails |
|---|---|---|
| `anti-hallucination` | Before every Edit/Write — verify target file/function/path exists or is in the HU's planned `files` | Lead runs Glob/Grep/LSP manually before the operation |
| `drillme` | Intra-HU before declaring done (Step 7 — 4 `[approach]` questions) | Lead invokes `/drillme "Phase 3 HU US{N}"` manually before closing the HU |
| `diagnostic-patterns` | When tests fail in Step 9 verification (5-whys, retry budget, stack-trace analysis) | Lead reads error output manually + applies error-recovery.md retry policy |
| `lsp-operations` | During Step 4 ejemplos + Step 5 impl — `findReferences`/`hover`/`goToDefinition` for semantic navigation when blast radius matters | Lead uses Grep + Read manually as fallback (less precise but functional) |
| `review-patterns` | ⚠️ Optional — during impl if quality concern emerges (SOLID violation suspected, performance bottleneck) | Lead invokes `/critic` review-patterns mode in Phase 4 anyway; intra-impl invocation is opportunistic |
| `meta-create` | When HU's `files` field includes new `.claude/skills/`, `.claude/hooks/`, `.claude/rules/`, `.claude/agents/`, `.claude/plugins/`, `.mcp.json` | Lead reads `meta-create/SKILL.md` manually before designing the extension (Commandment X — meta-system maintainability) |
| `meta-settings-cookbook` | When HU touches `CLAUDE.md`, `.claude/settings.json`, output styles, permissions, env vars | Lead reads `meta-settings-cookbook/SKILL.md` references manually |

> Skill-to-skill invocation is **probabilistic** per docs Anthropic + [issue #59968](https://github.com/anthropics/claude-code/issues/59968). For Phase 3, the canonical auxiliaries (anti-hallucination, drillme, diagnostic-patterns) MUST fire on every HU — the fallback column documents the Lead's manual recovery if auto-fire misses. `review-patterns` is opportunistic (⚠️); `meta-create`/`meta-settings-cookbook` are conditional on HU content.

## SIEMPRE rules

- HU-atomic: one HU at a time; never open two HUs in parallel.
- Glob/Grep ejemplos del proyecto BEFORE writing — preserve style.
- AskUserQuestion on concrete doubts; NEVER improvise.
- Read before Edit (always). Glob before Write (verify file does not exist).
- Tests pass before declaring "completed" (Commandment IV — no exceptions).
- Update `state.json` on every HU closure (closure + timestamp + tests_passed + delegation flag).
- If delegating to `builder` → include `[RELEVANT SKILLS]` + `[RELEVANT MEMORY]` blocks per Arch H.

## Adaptation intra-phase (Principio 2)

| Signal | Adaptation |
|---|---|
| HU trivial (1 file, known pattern, no ambiguity) | Skip exhaustive Glob; 1-2 examples max; reduced drillme (most-relevant question only) |
| HU touches business-critical code AND `test-policy.md` = `business-critical` | Strict red→green; no shortcuts; full drillme 4/4 |
| HU has `tdd-skip: <reason>` | Implement directly; suite verify; declare skip reason verbatim in Step 10 report |
| HU is markdown-only (validation-mode) | Skip `tests.md` consultation; apply Pre/Post/Structural/Smoke/Cross from `validations.md` |
| Tests fail 2x consecutive on same HU | STOP — escalate to user with diagnosis (per `error-recovery.md` Stuck Detection) |

## Casos edge

- **Edge 1** — HU `depends_on` not satisfied (HU listed in `us_pending` but a dep is also pending): STOP, execute dep first or escalate to Lead.
- **Edge 2** — `tests.md` has T{N}.X but the test file path conflicts with an existing test: ask user (rename/merge/skip).
- **Edge 3** — HU AC mentions a function that doesn't exist yet AND isn't in any HU's `files` field: smell — Phase 2 decomposition missed it; abort and escalate.
- **Edge 4** — Delegated to `builder` but it returns NEEDS_CHANGES or test failure: follow `error-recovery.md` (SendMessage to original builder if context is preserved; re-spawn if 2+ retries).
- **Edge 5** — User invokes `/build` but `state.json` says Phase 3 already complete: ask if re-run a specific HU or transition to Phase 4.
- **Edge 6** — HU touches sensitive path AND was delegated to `builder`: builder's `acceptEdits` permission mode + the Lead's `sensitive:` declaration cover it; no extra ceremony.

## Smell signals

- ⚠️ If a HU requires modifying files NOT listed in its `tasks/US{N}.md` `files` field → smell: reopen Phase 2 to refine the HU's scope.
- ⚠️ If 2+ `AskUserQuestion` fires in a single HU → HU was poorly defined; flag for retro (Phase 5).
- ⚠️ If implementation introduces duplication detected by Glob/Grep → refactor before closing the HU.
- ⚠️ If a TDD-mode test passes BEFORE impl (red expected, got green) → smell: the contract is misunderstood; STOP and confirm with Lead.
- ⚠️ If `diagnostic-patterns` retries exceed budget on the same HU → escalate; do not loop silently.
- ⚠️ If >30% HUs require `builder` delegation → smell: Phase 2 decomposition is too coarse; re-atomize.

## Anti-patterns

| Anti-pattern | Detection | Correction |
|---|---|---|
| Improvise on ambiguous AC | Code introduces decision not in AC + no `AskUserQuestion` fired | Revert ambiguous bit; ask user; redo |
| Skip red phase in forced TDD | `tests.md` says forced but impl committed before test ran red | Re-run test in isolation (revert temporarily); verify red was reachable; document in Issues |
| Over-engineer beyond AC | New abstraction/hook/fallback not requested in AC | Remove; simpler version that meets AC only |
| Report "completed" without verifying | No test output in Step 9 yet HU marked done in state.json | Reopen HU; run verify; only then re-close |
| Delegate to builder for 1-2 file changes | Delegation prompt sent for trivial HU | Recall; Lead executes directly (default-allow gate covers it) |
| Modify unrelated code "while there" | Diff includes files outside HU's `files` field | Revert non-HU edits; flag for retro if pattern emerges |

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | `anti-hallucination` before every Edit/Write — no invented references |
| III | Smallest diff that satisfies AC; over-engineering caught by drillme Q3 |
| IV | Tests pass before "completed"; no exceptions (blocking gate per HU) |
| V | Read AC + tests/validations + ejemplos del proyecto BEFORE writing |
| VI | Sensitive paths require inline declaration; destructive ops never run by this skill |
| VII | Parallel Reads when independent; delegate to builder only when isolation justifies cost |
| VIII | Delegation prompts to builder include AC + skills + memory blocks (Arch H meta-prompting) |
| X | Meta-extensions go through `meta-create` skill consultation (extensible meta-system) |

## Verification (post-implementation of this skill)

- Smoke: invoke `/build US{N}` on an approved `tasks/` + `tests.md` → executes exactly that HU; produces diff + tests pass.
- Verify `state.json` is updated with the HU's closure entry (timestamp, tests_passed, delegated_to_builder flag).
- Verify NO files outside the HU's `files` field are touched (Glob diff vs `files`).
- Verify if HU has `tdd: forced` then a test file was created + ran red before impl (audit via git log of the test file vs impl file).
- `bun test ./.claude/hooks/` → 81/81 (this skill is markdown only — no hook test impact).

## Output format reminder

When this skill closes a HU:

```
✅ HU US{N} closed.
- Files: [<paths>]
- Tests: <X/Y passing>; mode: <forced red→green | tdd-skip: <reason> | validation-mode | optional>
- Delegated to builder: <yes|no> (<reason>)
- AskUserQuestion fired: <N>
- state.json updated.

Next HU: US{M}
  → /build US{M} (specific)
  → /build (next pending)
  → /critic (if all HUs closed → Phase 4)
```

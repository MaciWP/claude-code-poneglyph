# Builder Agent Memory

## 2026-04-10 — Session e7515341
- The `builder` subagent has `Read` in its tool allowlist and can successfully load `SKILL.md` files directly via `Read`, making skill content part of its working context without needing the `Skill()` tool (which is Lead-only).
- This confirms default subagents support file-based skill loading as a migration mechanism — relevant for any architectural shift away from the `Skill()` invocation pattern toward direct `Read`-based skill injection.

## 2026-04-10 — Session e7515341
- Sandbox environment lacks `ssh`; any remote that uses `git@host:` URLs cannot be pushed from within agent execution. Check `git remote -v` before assuming push will work — HTTPS remotes are fine, SSH are not.
- When committing two unrelated working-tree changes, stage each file explicitly with `git add <path>` between commits rather than `git add -A` to guarantee clean separation without risking sibling files.
- `git branch <name>` succeeds even when the subsequent `git push` fails; always verify with `git rev-parse <branch>` so a partial failure is reported accurately rather than silently assumed complete.

## 2026-04-10 — Session e7515341
- Bun test filters require `./` prefix for dotfile paths (`./.claude/hooks/...`), otherwise Bun treats the filter as a glob and returns 0 matches.
- When extending `memory-inject.ts`, preserve the surrounding try/catch best-effort pattern — the hook must never crash Claude Code even if path-rule loading throws.
- `.claude/rules/paths/*.md` in this repo intentionally ship with empty `skills: []` (asserted by `remaining path rules after cleanup` test). Any feature that depends on path→skill mapping is dormant until a project adds its own path rule with populated `skills`.
- When adding a new exported interface + function to a lib, always update the barrel-style import in consumers to use `type` imports for type-only symbols (`import { fn, type Type }`) to keep isolatedModules-safe.

## 2026-04-10 — Session e7515341
- Rename-convention tasks have a subtle trap: anything parsed from prior-session JSONL or historical prompt text must accept BOTH the old and new markers, otherwise telemetry/spawn-parsers break silently on first run against old data. Always add a `LEGACY_*` constant + combined lookup, plus an inline comment.
- Complexity validator (threshold 25) counts `??` chains per-file — a single line like `a ?? b ?? c` adds 2 to the complexity count. When touching env-var fallback code, prefer one `??` or move the fallback to a lookup object.
- `git mv` only works on tracked files; when renaming a file that lives under a `.gitignore` pattern, `git mv` silently fails and you end up with an untracked new file. Check `git ls-files <path>` first to decide between `git mv` and plain `mv`.
- When renaming a file-name convention that appears in both code AND delegation prompt templates, the prompt markers (`[ACCUMULATED X]`, `### X Insights`) are effectively a public API between Lead and parser — renaming them requires coordinated updates to parser, rule templates, AND the agent output section header. Keep the output header stable if the parser relies on it; only rename file paths and input markers.
- Negation patterns in `.gitignore` (`!path/to/file`) are the clean way to keep one file tracked under a broader ignore pattern — this is a safer alternative to removing the ignore entirely when only a single file (like `builder/MEMORY.md`) is intentionally shared and the rest are personal state.

## 2026-04-10 — Session e7515341
- Sandbox shell for Bash tool has a severely reduced PATH: `cat`, `ls`, `head`, `tail` are not callable directly — only as `/bin/cat`, `/bin/ls`, `/usr/bin/head`, `/usr/bin/tail`. For HEREDOC commit messages, write the body to a temp file and pass `-F /tmp/msg.txt` instead of piping through `cat <<'EOF'`.
- When importing content from one repo to another, always run `git check-ignore` on each target path before `git add` — a stale `.gitignore` entry can silently block the import even when the destination directory does not exist and there is no real file collision.
- Poneglyph's `.gitignore` has a "Project-level skills (not deployed globally)" block listing skill directories that should never be committed to the global symlink source. When a name there is reused for a genuinely global skill, the stale line must be removed as part of the import.
- For bulk multi-file text substitution inside an already-imported skill, `/usr/bin/sed -i ''` (BSD sed, macOS) handles several patterns in one invocation with `'s|a|b|g; s|c|d|g'` — much faster than individual `Edit` calls when the same literal appears in many docs.
- `bun test` must be invoked as `bun test ./.claude/hooks/` with the leading `./` — without it, bun treats the dotfile path as a filter expression and matches zero tests.

## 2026-04-10 — Session e7515341
- `path-rule-loader.ts` auto-prefixes `(^|.*/)` only when the pattern does not already start with `.*` — since `**` compiles to `.*`, patterns beginning with `**/` lose the leading-segment-optional behavior and require at least one path segment before the first literal.
- The `remaining path rules after cleanup` test block hard-codes `rules.length === 2` as a migration invariant; any phase that adds new path rules must update this assertion alongside the new files or the hooks test suite fails.
- The loader derives `PathRule.name` from the filename (via `readMarkdownFiles` → `entry.name`), so a `name:` field in frontmatter is cosmetic and does not need to match the filename — but keeping them aligned avoids confusion when grepping.
- `parseFrontmatter` tolerates extra fields (`description`, `name`) without error — only `globs`, `skills`, `keywords`, `priority` are consumed — so frontmatter can carry human-readable metadata safely.

## 2026-04-10 — Session e7515341
- The `memory-inject.ts` hook correctly composes multiple context sources (Agent Success Rates + Path-Based Skills) into a single `additionalContext` string, and emits `sessionTitle` as a sibling when first-turn is detected.
- Path rules match via globs with `**/segment/**/*.ext` patterns — both `src/apps/assets/views/assets.py` and `src/features/auth/hooks/use-login.ts` match without requiring the full `src/` prefix, confirming path-rule-loader's auto-prefix behavior works.
- Missing transcript files are correctly treated as first-turn (sessionTitle is emitted), validating the defensive parsing behavior in `isFirstTurn`.
- The hook is self-contained: it works in isolation via stdin JSON without needing a live memory API, falling back gracefully to enrichment context only.

## 2026-04-10 — Session e7515341
- When splitting a skill into main body + `references/` bundle, keep a single `Deep references (Read on demand)` pointer table at the bottom with a small table: `When | Read file`. The word triggering the lookup (e.g. "Binora") is acceptable there because it describes *when to read*, not *what the skill claims*.
- For Django ORM examples in a skill body, the canonical pair from the Django docs optimization page is `Blog/Entry`; for DRF ViewSet examples the canonical pair from the tutorial is `Snippet` (or `User`). Picking one consistently per file avoids reader whiplash.
- When removing entire labelled sections from a skill (e.g. "Binora-Specific Patterns"), grep for the heading's body terms afterward (`datacenter`, `FrontendPermissions`, etc.) — section headers hide leaked references that remain in tables, code blocks, and "Critical Reminders" lists lower in the file.
- Reference files under `skills/*/references/` only need minimal frontmatter (`parent`, `name`, `description`) — they are not loaded as standalone skills, so no `version`, `allowed-tools`, or `for_agents` needed.
- `git commit -F /tmp/msg.txt` is the reliable way to pass multi-line commit messages in this sandbox — HEREDOC `<<'EOF'` piped to git works only if `cat` is on PATH, which it is not (must use `/bin/cat`).

## 2026-04-10 — Session e7515341
- Native Poneglyph skills' `activation:` block uses **only** `keywords:` — no `when:` subkey exists in any of the 23 native skills. When a task spec contradicts existing convention, verify the convention before following the spec.
- YAML frontmatter `activation:` placement is consistently between `description:` and the next field (`allowed-tools`, `for_agents`, or `license`) — this is the insertion point for new keyword blocks.
- For bulk frontmatter edits across many skills, anchoring `old_string` on the last line of `description:` plus the following field name (e.g., `"...\nallowed-tools:"`) gives unique match points per file without needing to read each full frontmatter.
- `bun test ./.claude/hooks/` is fast (~3s, 429 tests) and safe to run after every frontmatter-level change — it validates YAML structure indirectly via skill loader tests.

## 2026-04-10 — Session e7515341
- `meta-create-skill` frontmatter reference (line 851+) is authoritative and explicitly lists `allowed-tools` as INVALID for skill frontmatter — it belongs on agent frontmatter as `allowedTools`. Imported skills from other projects often carry it; strip during alignment.
- The canonical field order observed across native Poneglyph skills is: `name → description → type → disable-model-invocation → argument-hint → effort → activation → for_agents → (context) → version`. Third-party fields like `license`/`metadata` (e.g. Vercel-authored skills) go at the tail.
- `context: fork` is a legitimate preserved field for imported skills that need isolated context — it's not in meta-create-skill's core reference but does not break validation.
- Bun test suite for `.claude/hooks/` does not validate skill frontmatter schemas — frontmatter-only edits to skills cannot break the 429 test suite, making these alignments safe to batch.
- When a skill has a non-block-scalar description (single-line) mixed in a batch where others use `|`, leave it: both are valid YAML and rewriting risks subtle semantic changes (trailing newlines, escapes).

## 2026-04-10 — Session e7515341
- When auditing skill frontmatter, `disable-model-invocation: false` appears as a string literal per YAML parsing — do not confuse absent (`null`) with `false`; only `null` should flag `missing-dmi`.
- The global description budget (~15,500 chars with ~109 chars XML overhead per skill) is a real constraint at ~40 skills; each new skill costs roughly 400 chars (description + overhead), so growth must be paired with trims.
- Poneglyph's complexity validator counts per-file not per-function with threshold 25 — audit scripts that parse YAML frontmatter and walk directories quickly hit 25-40 complexity. Split into `lib.ts` + `runner.ts` with extracted helpers (`analyzeDescription`, `walkCount`, `checkLineCount`) to stay under. Single early-return swap (`if...else` → `if...return`) was enough to drop from 26 to under threshold on one attempt.
- The 6 `meta-create-*` skills are all >500 lines (worst: `meta-create-hook` 914, `meta-create-skill` 902) — this is the largest single source of CRITICAL benchmark violations and a candidate for a dedicated SKILL.md + references/ split phase.
- Imported skills (P1-P3 batch) land with tight, conservative description lengths (avg ~263 vs global ~285) — the import pipeline is well-disciplined; the budget pressure comes from older native skills with longer descriptions, not the imports.

## 2026-04-10 — Session e7515341
- When a skill is only a few lines over the 300-line soft cap, inlining short handler functions as arrow props on the JSX element itself is the least-invasive trim — it removes ~20 lines without losing any API surface visibility.
- `wc` and `cat` are not in the sandbox PATH but `/usr/bin/awk 'END{print NR}' <file>` and `/usr/bin/tail` work as line-count / pipe alternatives.
- `bun test ./.claude/hooks/` runs in ~3s and is the right smoke test after any `.claude/skills/**/SKILL.md` edit — frontmatter parsing is covered indirectly by skill-loader tests.

## 2026-04-10 — Session e7515341
- Lazy reference-following in Arch H sub-pattern is real: subagents skip pointer-table references when task phrasing doesn't match the `When` column. Mitigate by inlining high-impact gotchas and adding a `Triggers` keyword column.
- `select_related()` on a `GenericForeignKey` is silently ignored by Django — no error, no warning, just a no-op. High-value gotcha to surface inline in any Django query-optimization skill.
- When extending a `Critical Reminders` numbered list, append rather than reorder — existing items may be cited by number in other files (cross-references).

## 2026-04-10 — Session e7515341
- Splitting a meta-create-* skill along "reader question boundaries" (one reference per question) beats splitting by original section headings — the latter produces tightly-coupled references that can't be read standalone.
- The 3-column Content Map's Contents column is load-bearing for lazy reference-following: phrase it as a trigger ("Read when...") not a summary.
- `${CLAUDE_SKILL_DIR}/...` is the correct Anthropic-official path variable for intra-skill references; relative and absolute paths both fail in different ways.
- Reference files need only `parent`, `name`, `description` frontmatter — adding `type`/`version`/`activation` is noise (they are not loaded as standalone skills).
- `git add <explicit paths>` keeps unrelated dirty files (like `.claude/agent-memory/builder/MEMORY.md`) out of a refactor commit — important when the session has persistent-memory side effects.

## 2026-04-10 — Session e7515341
- Reader-question splitting works consistently for meta-create-* skills: frontmatter → `*-spec.md`, templates → `templates.md`, examples → `examples.md`, pitfalls → `gotchas.md`. The shape is stable across rule/mcp/agent/plugin/hook.
- When a skill already has a `templates/` subdirectory with actual template files (like meta-create-agent), create a separate `references/templates-spec.md` for documentation rather than collapsing the two — they serve different reader needs (filling placeholders vs. understanding what placeholders exist).
- Large gotchas tables (10-12 items) compress well into 5-9 inline "Critical Reminders" in the entry by picking the items that apply to EVERY use of the skill, and leaving the long-tail ones in `gotchas.md` for troubleshooting.
- The `${CLAUDE_SKILL_DIR}/references/X.md` path format is robust — Content Map table rows reading "Read when [situation]" in the Contents column reliably trigger follow-up reads based on task phase.
- Full `bun test ./.claude/hooks/` runs in ~2.7s; running it after every split is cheap insurance and caught zero regressions across 6 commits (frontmatter-only changes are safe by construction).

## 2026-04-10 — Session e7515341
- When a skill has a flat layout (module files as siblings of SKILL.md rather than under `references/`), the Content Map still uses `${CLAUDE_SKILL_DIR}/<name>.md` — just without a subdirectory segment. This mirrors the filesystem and avoids broken relative `./` links.
- Canonical 3-col Content Maps can be safely added alongside existing inline prose references ("see `references/foo.md`") without removing them — the prose adds contextual "why now" hints mid-flow, the Content Map is the authoritative index. They serve different reader modes.
- The Contents column should describe BOTH what's in the file AND the situation that triggers reading it — "Read when..." phrasing converts the column into a lazy-evaluation trigger rather than a passive summary. Lazy reference-following needs explicit triggers to fire reliably.
- For multi-file skills (6+ siblings), richer Contents descriptions help the reader pick the right file in one Read rather than speculative-reading 2-3 — especially when module names are terse (`corrections.md` vs `anti-patterns.md` are hard to disambiguate without contents hints).
- `bun test ./.claude/hooks/` validates skill frontmatter parsing indirectly via the skill-loader suite — frontmatter-preserving content edits to SKILL.md files are safe to batch-commit with a single test run at the end.

## 2026-04-10 — Session e7515341
- The 5 canonical skill types per `meta-create-skill/references/skill-types.md` are: `knowledge-base`, `encoded-preference`, `workflow`, `reference`, `capability-uplift`. Before flagging a skill's type as anomalous, check this file — `capability-uplift` appearing only on `lsp-operations` is by design (it's the documented exemplar).
- The `Keywords - ...` inline line in a skill description often duplicates `activation.keywords` verbatim. Trimming it (keep only terms NOT in the activation list) is the safest way to reduce description length without losing auto-match coverage. Auto-matching reads `activation.keywords`, not the description line.
- The description block scalar (`description: |`) counts all lines including the trailing newline per line for budget — 4 description lines averaging ~70 chars each = ~280 chars minimum; going below that requires collapsing to 3 lines.
- For skill description budget audits, measure with an awk one-liner that reads between `description: |` and the next top-level frontmatter key — `/usr/bin/awk 'BEGIN{d=0} /^description: \|/{d=1;next} d&&/^[a-z-]+:/{d=0} d{print}'` is the canonical extractor.

## 2026-04-10 — Session e7515341
- The "canonical solution + limitations" framing is load-bearing when documenting an empirically-tested pattern: readers default to treating the first mitigation as primary, so ordering a mitigations table by effectiveness (Primary/Secondary/Fallback) is clearer than a flat list.
- When a reference file documents a pattern that is canonically defined elsewhere in the repo (e.g., `context-management.md`), include a one-line pointer to the canonical location — prevents drift and lets the reference file stay focused on the local (skill-scoped) concern.
- Small citation gaps (missing Anthropic official quote/link) are easy to miss during a pattern rollout because the mechanism works without the citation; explicit verification passes like P7.5 catch them.
- Splitting docs changes into separate commits per file/concern (even when they are the same phase) makes `git log` useful for future bisects; the ~1.5-minute cost of three commits beats the debugging cost of hunting a cross-file regression in a mega-commit.

## 2026-04-10 — Session e7515341
- The sandbox complexity validator fires on `PostToolUse:Write` for any file under `/tmp` too, not just project paths — decomposing into 6 small modules (io, metrics, aggregate, recs, html-css, html-js, html-sections, run) was necessary to keep every file under 25 cyclomatic complexity.
- `~/.claude/traces/*.jsonl` in this environment is Stop-hook raw capture, not structured: every trace record has the schema fields present but all set to `null` except `ts`, `sessionId`, `status` (always "unknown" or "timeout"), and `rawInput`. Any insights command that depends on agents/skills/cost/tokens from traces will show empty states — the fix is at the hook level, not the consumer.
- `agent-scores.jsonl` uses hashed agent IDs (e.g. `a70e1fcf87cd94726`), not human-readable names, so charts must aggregate by `taskType` instead of agent name to be interpretable.
- `patterns.jsonl` exists as a single-newline file (1 byte) — treat "empty after parse" and "missing file" identically in dashboard consumers.
- Using `rawInput.cwd` to derive a project name is the only reliable cross-session signal when structured trace fields are null — yields a useful "activity by project" breakdown even from otherwise-empty traces.

## Accumulated Expertise (migrated from EXPERTISE.md)

## 2026-04-09 — Session e5ff0515
- When migrating commands to skills, the body content maps 1:1 — no transformation needed, just wrap in v2 frontmatter above it.
- The `allowed-tools` frontmatter field from commands has no direct skill equivalent; it belongs in `for_agents` or can be mentioned in the body prose if needed.
- Skills in `.claude/skills/` require a `SKILL.md` filename (not the skill name), inside a directory named after the skill — this is the canonical structure.
- `rm` on Windows via bash in Claude Code works without quoting issues for paths with backslashes as long as the shell is bash (not cmd).
- After a skill migration, verifying with both Glob on `commands/` (to confirm deletion) and Glob on `skills/` (to confirm creation) in a single parallel call is the fastest sanity check pattern.

## 2026-04-09 — Session e5ff0515
- The docs contained implementation code (TypeScript) and aspirational features (cache strategy, Levenshtein fuzzy match as actual code). Extracted only the tactical patterns — threshold tables, keyword triggers, pipeline stages — discarding the code scaffolding that is not actionable in a skill context.
- The confidence formula (file +30, function +25, past success +25, clear requirements +20) is a useful mental model even without code implementation — worth keeping as a prose line rather than a code block.
- "Verify threshold" in the docs was called "Proceed Threshold" — renamed to "Verify threshold" in the table header to match the task spec, which is more intuitive (you verify before proceeding, not proceed without verifying).
- Skill markdown sections should separate what triggers a rule from how to act — the "ask even if confident" clause was extracted as a separate paragraph to keep the threshold table clean and scannable.

## 2026-04-09 — Session e5ff0515
- The `check-staleness` hook tracks reads at the file-path level and rejects edits even when the file was read in the same session via a parallel batch — a second explicit `Read` call with the same path satisfies it because the hook re-checks on the exact path key.
- Pipe characters inside table cells in GitHub-flavored Markdown require escaping (`\|`) to avoid breaking the table column boundaries — relevant when embedding regex alternation patterns like `password|passwd|pwd` inside a table.
- Skill files store only the `---` frontmatter block at the top; the `**Version**` footer line at the bottom is part of the body, not frontmatter — safe to anchor edits on it without touching YAML.
- The `scripts/` section in a skill acts as a discoverable entry point for automation; new detection patterns that have a companion script should be cross-referenced there rather than described inline.

## 2026-04-09 — Session e5ff0515
- The `safe-refactoring.md` doc contains implementation-level code (TypeScript functions, examples) that is already subsumed by the skill's reference files — only the classification table and confirmation rules represent genuinely new policy-level content worth absorbing.
- When absorbing docs into skills, the right filter is: does this add a decision rule the agent needs at invocation time, or is it reference detail already covered by on-demand files? Policy tables pass; code examples usually don't.
- Frontmatter MUST NOT be touched when modifying skill body — the `name`, `activation.keywords`, and `for_agents` fields drive auto-matching at orchestration time.
- The footer separator (`---`) before version metadata is load-bearing for readability conventions across all skill files in this repo — new sections should go above it, not after it.

## 2026-04-09 — Session e5ff0515
1. Source docs (`test-generation.md`, `README.md`) had overlapping content — the mutation testing concept appeared in both. Distill once into the skill rather than duplicating.
2. The existing skill's last real section was the reviewer checklist; inserting after its final list item is the cleanest anchor for `old_string` uniqueness without touching frontmatter.
3. Edge-case auto-detection keyword table (valid/isValid, numbers, strings, arrays, dates, optional) comes directly from `test-generation.md`'s "Detect from keywords" pattern — reusable signal for any future test-generation tooling.
4. The three new sections (Mutation Testing, Edge-Case Auto-Detection, Always-Generate Error Cases) map 1:1 to the three generation strategies in the source docs: quality gate, edge cases, error cases — clean conceptual separation.
5. Skill files use the existing body without frontmatter modification; always anchor `old_string` to a unique last line of the preceding section to avoid ambiguity on re-edits.

## 2026-04-09 — Session e5ff0515
- `settings.local.json` is validated by Claude Code on save — removing a block with Edit leaves trailing commas that fail JSON schema validation; use Write for block-level deletions in JSON config files
- When the entire `hooks` section contains only dead entries, the cleanest approach is to remove the whole `hooks` key rather than leaving an empty object (which could also confuse validators)
- Glob confirms file existence before deletion — never assume files listed in task descriptions still exist in the same location

## 2026-04-09 — Session e5ff0515
- `stop_hook_active` is a boolean field in Stop/SubagentStop stdin JSON that signals recursive invocation -- must be checked early to prevent infinite loops
- When a hook's `run()` function has `.finally(() => process.exit(0))`, prefer `return` over `process.exit(0)` in the guard to keep flow clean
- `validate-file-contains.ts` had a `consumeStdin` that discarded data (`on("data", () => {})`) -- this prevented broken pipe errors but made it impossible to read stdin fields; switching to collecting chunks fixes both concerns
- `session-digest.ts` never consumed stdin at all -- adding `consumeStdin()` also prevents potential broken pipe issues beyond just the `stop_hook_active` guard

## 2026-04-09 — Session e5ff0515
- `"async": true` in Claude Code hook entries causes the hook to run fire-and-forget — Claude Code does not wait for the process to finish, so observability hooks (trace, digest, scoring) no longer add latency to the session boundary.
- Blocking hooks (`validate-tests-pass.ts`, `validate-file-contains.ts`) must NOT have `"async": true` because their exit codes (0 = pass, 2 = block) are only meaningful when Claude waits for the result.
- The `timeout` field remains meaningful even with `"async": true` — it still caps the process lifetime, just doesn't gate Claude's response.

## 2026-04-09 — Session e5ff0515
- The `status` field in traces has two sources: `detectStatus()` returns `"completed"/"error"/"timeout"/"unknown"`, but `buildTraceMinimal()` uses raw `stop_hook_event` values like `"stop"` -- any success-check logic must account for BOTH paths.
- The `ERROR_STATUSES` set `["error", "failed", "timeout", "interrupted"]` is defined identically in `session-digest-resolve.ts` and now in `agent-scorer-calc.ts` -- consider extracting to a shared constant in `agent-scorer-types.ts` or a common constants file to avoid drift.
- Inverting error checks (`!ERROR_STATUSES.has(status)`) is safer than allowlisting success values because new non-error statuses (like `"stop"`) automatically count as success without code changes.
- Memory-inject noise: filtering `successRate === 0 && sampleSize < 5` prevents injecting meaningless "0% success" context that could mislead the Lead's routing decisions.

## 2026-04-09 — Session e5ff0515
- `lesson-extractor.ts` had no dedicated test file — the function is covered indirectly only through integration. Future changes should add a unit test file for `findExplicitLesson` since regex edge cases are easy to break silently.
- The old `CORRECTION_PATTERNS` used `gi` flags on regex literals stored in an array — each `.exec()` call on a `g`-flagged regex advances `lastIndex`, so the explicit `pattern.lastIndex = 0` reset before each `exec` was necessary and correct. When replacing with non-`g` patterns, the reset is no longer needed.
- The explicit `/learn` marker approach aligns naturally with the existing `/learn` command workflow (`lessons-recorder.ts`) — the session-digest hook now acts as a secondary capture for users who type `/learn` in the chat rather than as a slash command.
- `MINING_THRESHOLD` in `session-digest.ts` gates on `countTraceFiles()` which counts daily trace files (one per day), so 50 = 50 days. 10 = ~2 weeks is a much more practical default for a personal tool used daily.

## 2026-04-09 — Session e5ff0515
- `loadPatterns` name collision between `pattern-learning` (workflow patterns) and `error-patterns` (error patterns) requires aliased import (`loadPatterns as loadErrorPatterns`)
- `getBestFix()` in `error-patterns.ts` uses aggregated fix stats (grouping by description) and returns the description with the highest success rate, or null if no successful fixes exist
- `ErrorPattern.successRate` is precomputed on the pattern itself (overall), but `getBestFix()` computes per-fix-description rates internally - the two can differ, so use `p.successRate` for display and `getBestFix()` for selecting which fix to recommend
- `memory-inject.ts` follows a strict best-effort pattern: every enrichment section is wrapped in try/catch to prevent any single data source failure from blocking the entire hook
- The `occurrences` field on `ErrorPattern` tracks how often the error was seen (recorded via `recordError()`), making it the right sort key for "most common" patterns

## 2026-04-09 — Session e5ff0515
- Path rule files (`.claude/rules/paths/*.md`) previously used YAML frontmatter (`globs:`, `priority:`) to declare which file paths they applied to — but Claude Code does not parse frontmatter in `.md` rule files; the fields were inert. Removing them eliminates confusion without changing behavior.
- When updating counts in CLAUDE.md, the same number appears in three distinct places: the WHY table prose, the mermaid diagram node label, and the structure comment — all three must be updated atomically.
- The CLAUDE.md is a symlink target (`~/.claude/CLAUDE.md` → this file); edits here propagate globally to all projects immediately.

## 2026-04-09 — Session e5ff0515
- The staleness check hook requires a `Read` call on the exact file path (Windows-style path) within the same session before any `Edit` — re-reading a few lines is sufficient to satisfy it, it does not require reading the full file again.
- When two commands in a table are being merged (dead one replaced by live one), removing the dead row entirely is cleaner than updating it — avoids duplicate entries with different descriptions.
- Mermaid node labels (`IS[/implement-spec]`) and participant aliases (`participant IS as /implement-spec`) are separate occurrences from prose references and need independent grep hits to catch all of them.
- `grep -rn` on Windows paths must use forward-slash `/d/PYTHON/...` Unix-style form in bash, not backslash or quoted Windows paths, to avoid shell quoting errors.
- When a grep returns zero output (no matches), bash exits with code 1 but produces no stdout — treat empty output as confirmation of zero matches, not as an error.

## 2026-04-10 — Session e5ff0515
- The meta-create-* skills follow a strict structural pattern: frontmatter (v2 canonical order) -> one-line description heading -> When to Use -> Workflow (5 steps: Parse, Determine type/scope, Gather details, Generate, Confirm) -> System Reference -> Templates -> Arguments with Validation -> Examples (2-3 complete) -> Directory Structure -> Frontmatter Reference -> Related. Deviating from this order makes the skill feel inconsistent with its siblings.
- The `paths:` frontmatter field in rules is the ONLY officially supported field. Other frontmatter fields (priority, globs, weight) are not part of Claude Code's rule spec and will be silently ignored. This is a critical gotcha for anyone creating path-scoped rules.
- Path-scoped rules only trigger on READ operations, not Write/Edit. This means if a rule needs to apply during file creation, it must be always-on instead. This is a non-obvious behavior that should always be documented in rule creation guides.
- Meta-create-agent has 559 lines, meta-create-skill has 897 lines. The new meta-create-rule at 501 lines fits within the expected range. Rules are simpler than agents/skills (only 2 scopes vs 4-5 types), so the lower line count is proportional.

## 2026-04-10 — Session e5ff0515
- Meta-skill files in Poneglyph follow a strict v2 canonical frontmatter order: `name`, `description`, `type`, `disable-model-invocation`, `argument-hint`, `effort`, `activation.keywords`, `for_agents`, `version`. The field order matters for consistency across the three meta-skills.
- Hook stdin shapes vary by event type -- tool events get `tool_name`/`tool_input`, Stop events get `transcript`/`stop_hook_active`, session events get minimal data. Documenting the exact shape per event prevents callers from guessing.
- The `stop_hook_active` guard is the single most critical gotcha for hook creation -- without it, a Stop hook that exits 2 creates an infinite loop that hangs Claude Code. This must be prominently featured in any hook creation workflow.
- Exit code 2 only blocks on PreToolUse and PermissionRequest events. On other events it is treated as a non-blocking error. This distinction is not obvious from the docs and causes confusion.
- The three meta-skills (agent, skill, hook) share the same structural pattern: frontmatter -> When to Use -> Workflow (5-6 steps) -> Templates -> Arguments -> Examples -> Frontmatter Reference -> Related. This pattern should be followed for any future meta-skill.

## 2026-04-10 — Session e5ff0515
1. When inserting a new section between two existing sections, the most reliable `old_string` anchor is the heading of the section immediately after the insertion point (e.g., `## Workflow\n\n### Step 1`) — this is unique enough and avoids ambiguity caused by repeated section names deeper in the file.

2. Removing a single list item from markdown is cleanest when the `old_string` includes the line above or below as context, preventing accidental double-newline artifacts that would appear as blank list separators.

3. Verifying edits with a targeted `Grep` on the surrounding section headings (rather than re-reading entire files) is faster and confirms structure without re-loading hundreds of lines of unchanged template content.

## 2026-04-10 — Session e5ff0515
- Meta-skill files in this project follow a strict section order: frontmatter -> # Title -> ## When to Use -> ## Official Documentation -> ## Workflow (Steps 1-N) -> ## Reference -> ## Templates -> ## Arguments -> ## Examples -> ## Related. Deviating from this causes inconsistency across the meta-create-* family.
- The v2 canonical frontmatter field order is: name, description, type, disable-model-invocation, argument-hint, effort, activation (with keywords sub-list), for_agents, version. All existing meta-create skills follow this exact order.
- Existing meta-create skills range from 450-558 lines. The 350-500 target is a guideline; matching peer file sizes (meta-create-agent at 558) is more consistent than artificially cutting content.
- `for_agents: [extension-architect]` is the standard value for all meta-create skills -- they are meant to be invoked by the extension-architect meta-agent, not by individual agents.

## 2026-04-10 — Session e5ff0515
- SPEC reference lines in skill files follow a consistent pattern (`**Spec**: SPEC-NNN`) at the bottom metadata block alongside `**Version**` — always check that block when searching for spec references.
- When removing a line from a metadata block where the surrounding lines are unique (like `**Version**` + `**Spec**` + `**For**`), include adjacent lines in `old_string` to guarantee uniqueness and avoid ambiguous matches.
- Batching all three parallel Reads then all three parallel Edits cuts round-trips from 6 sequential calls to 2 batched messages — apply this pattern whenever edits are independent.

## 2026-04-10 — Session e5ff0515
- **`Bun.write()` is async and not guaranteed to flush to disk before child processes start on Windows.** When a test's `beforeAll` writes a fixture file with `Bun.write()` and subsequent tests spawn subprocesses that read that file, the child process may see the file as missing. Always use `writeFileSync` from Node's `fs` module for test fixture setup — sync I/O is the only safe guarantee across process boundaries.
- **`beforeAll` with async ops that produce side effects for subprocesses is a hidden coupling.** The async nature of `Bun.write` is fine for same-process reads (Bun buffers the result), but a spawned subprocess has its own filesystem view and depends on the OS-level flush. This is a Windows-specific timing hazard that doesn't reproduce on Linux/macOS with the same frequency.
- **When fixing async fixture setup, also drop the `async` keyword from `beforeAll`.** If there are no remaining `await` expressions, keeping `async` is misleading and can mask future regressions where someone adds an `await` back unnecessarily.

## 2026-04-10 — Session e5ff0515
1. Meta-skill pattern consistency: all meta-create-* skills follow identical frontmatter structure (name, description with "Use proactively when:" + "Keywords -", type: encoded-preference, disable-model-invocation: true, argument-hint, effort: medium, activation.keywords, for_agents: [extension-architect], version: "1.0"). Deviating from this breaks auto-matching.
2. Plugin vs other config types: plugins are uniquely complex because they are the only config type that bundles ALL other types (skills, agents, hooks, MCP, LSP) into a single distributable unit. This means the meta-skill must reference patterns from all other meta-create-* skills.
3. The `.claude-plugin/` directory vs root layout is the single most common mistake in plugin creation -- components placed inside `.claude-plugin/` instead of at plugin root are invisible to Claude Code auto-discovery.
4. Plugin hooks use `hooks/hooks.json` (a standalone file) whereas global hooks use `settings.json`. This distinction is critical and must be called out prominently in any plugin documentation.
5. The `${CLAUDE_PLUGIN_ROOT}` vs `${CLAUDE_PLUGIN_DATA}` distinction maps to bundled-assets vs persistent-state -- confusing them causes data loss on plugin updates since `CLAUDE_PLUGIN_ROOT` changes with each version.

## 2026-04-10 — Session e5ff0515
1. Meta-skill frontmatter v2 canonical field order is: `name`, `description`, `type`, `disable-model-invocation`, `argument-hint`, `effort`, `activation`, `for_agents`, `version` -- this exact order must be preserved across all meta-skills for consistency.
2. Skills organized by config type (numbered sections) rather than workflow steps work well as quick-reference material -- the pattern is distinct from workflow-oriented meta-skills like `meta-create-agent`.
3. Gotchas sections formatted as tables (Gotcha | Detail) are more scannable than numbered lists -- this matches the formatting rule preference for tables over lists >3 items.
4. The 400-550 line target for comprehensive reference skills balances completeness with token cost when loaded as context -- each section should have What/Template/Gotchas at minimum.
5. Permission rule syntax (`Tool(specifier)`) with glob patterns is the same format used in both `settings.json` and hook `if` fields -- documenting it once in a central reference avoids duplication across meta-skills.

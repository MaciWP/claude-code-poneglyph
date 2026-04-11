# Builder Agent Memory

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

## 2026-04-11 — Session 36fa8223
1. **Mechanical plan application benefits from parallel reads first**: reading all 3 target files in a single parallel batch before any edits eliminates the risk of stale-content conflicts and removes sequential round-trip overhead — this pattern is always safe for pre-edit reads.

2. **Rule-file edits never break the hook test suite**: changes to `.claude/rules/*.md` are pure markdown — the `bun test ./.claude/hooks/` suite validates TypeScript hook logic, not rule prose, so a full test run after rule edits is a safe no-regression signal with ~0% failure probability.

3. **Pre-verified anchors dramatically reduce edit risk**: when a plan explicitly pre-verifies `OLD` strings before delegation, the builder can apply edits without re-checking anchor uniqueness, treating the task as purely mechanical. The only failure mode is file mutation between planning and execution.

4. **Section-header anchors (`## SectionName`) are the most robust Edit targets in markdown**: they are always unique within a well-structured doc and don't shift position if surrounding content changes — prefer them over line-content anchors when inserting new sections before existing ones.

## 2026-04-11 — PreToolUse hooks (lead-parallelism-gate)
1. **PreToolUse hooks for `Agent` receive `tool_name`, `tool_input`, `session_id`, and `transcript_path` in stdin** — the transcript file is a JSON array of `{role, content}` objects (same shape used by Stop hooks). Reading the last user/assistant message requires iterating in reverse.
2. **`content` in transcript entries can be a string OR an array of content blocks** — always handle both shapes: `typeof content === "string"` vs `Array<{type, text}>`. The extractor pattern `extractText()` encapsulates this safely.
3. **Use `writeFileSync` (not `Bun.write`) in test `beforeAll` when spawning subprocesses** — `Bun.write` is async and may not flush before the child process reads the file on Windows. `writeFileSync` guarantees OS-level flush across process boundaries.
4. **Best-effort PreToolUse hooks use `appendFileSync` (sync) for audit logs** — async writes (like `Bun.write`) risk data loss if the process is terminated early; sync append is more reliable for JSONL audit trails.
5. **Heuristic warning hooks should log `dependency_reason_found: false` as explicit boolean in the JSONL entry** — this makes the audit log filterable: `jq 'select(.dependency_reason_found == false)'` isolates true skips from false positives.

## 2026-04-11 — Session 36fa8223
1. **Transcript schema has two incompatible shapes in this project**: the `transcript_path` JSONL uses `{type, message}` envelopes, while the inline `transcript` field (Stop hook stdin) uses `{role, content}`. Any function that filters on `msg.role` only works on the inline path. This is a pre-existing impedance mismatch that makes all per-transcript metrics `null` in production today.

2. **Additive fields to `TraceEntry`/`ResolvedTraceEntry` require updates in 4 places**: the interface in `trace-logger.ts`, `RESOLVED_DEFAULTS` in `trace-analytics.ts`, `normalizeEntry` in `trace-analytics.ts`, and both `buildTraceWithTranscript` + `buildTraceMinimal` in `trace-logger.ts`. Missing any one causes TypeScript errors.

3. **`trace-metrics.ts` is the right home for per-transcript scalar calculations** — functions that take `TranscriptMessage[]` and return a number. `trace-aggregation.ts` handles cross-entry rollups. `trace-analytics.ts` handles I/O, filtering, and query orchestration. The layering is clean and should be preserved.

4. **The `MIN_AGENTS_FOR_RATIO = 3` threshold prevents null-distortion from short sessions** — this was explicitly called out in the plan's risk analysis ("distorted by short sessions"). The value 3 matches the plan's stated threshold.

5. **When choosing Option A/B/C for a data gap, prefer Option C (null) over Option B (assume default)** — returning `null` is self-documenting and shows up clearly in dashboards/alerts. Option B (default to "sonnet") would silently pollute the ratio without any signal that data was missing.

## 2026-04-11 — Session 36fa8223
1. **The PostToolUse complexity validator is a per-file whole-content branch-count (threshold 25) that regex-counts `if|else|for|while|case|catch|&&|\|\||\?(?!:)` across the entire file.** It fires on `Write` (reads `tool_input.content`) but NOT on `Edit` (no full content in tool_input). For files approaching the limit, prefer `Edit` for incremental changes; for new files, plan the structure in advance and split aggressively. Lookup tables (`Array<[RegExp, string]>`) replace multiple `if` chains cleanly.

2. **Hook modules that call `main()` at the bottom must guard with `if (import.meta.main)` if they are ever imported as a value module.** `import type` imports are erased at compile time and do not trigger module body execution, but importing a runtime value forces the module to run. The guard is the standard Bun-idiomatic way to make a script both runnable (`bun script.ts`) and testable (`import { helper } from "./script"`).

3. **JSONL parsing must be per-line with per-line try/catch, never `JSON.parse(wholeFile)`.** The one-catch-per-line pattern lets corrupt lines be skipped individually rather than discarding the entire file — critical for best-effort logging hooks where partial data is better than none.

4. **Claude Code transcript JSONL has two incompatible shapes that coexist in-project**: the persisted `transcript_path` files use `{type, message: {role, content, ...}, timestamp, ...}` envelopes, while Stop-hook inline `transcript` uses flat `{role, content}`. A normalizer function that accepts BOTH (flat passthrough + envelope unwrap) is the cleanest bridge — keeps legacy tests and existing extractors working while gaining envelope support.

5. **Authoritative `message.usage` on Claude Code transcripts has THREE input-token fields** (`input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`) that must all be summed into the total — missing any of them undercounts by an order of magnitude for cache-heavy sessions (typical: cache_read dominates by 10-100x).

## 2026-04-11 — Session 36fa8223
1. **Untracked-file commits via `git add <file>` work the same as modified-file commits** — the pre-commit hook runs the full test suite regardless of whether the staged change is `A` (new) or `M` (modified). No special handling needed for the first commit of a file.

2. **When Phase N leaves ambient dirty state unrelated to the task, prefer `git add <specific-file>` over `git commit -a`** — this session had a pre-existing `.claude/agent-memory/builder/MEMORY.md` modification from earlier hook runs that would have silently polluted a `-a` commit. The specific-file-only discipline is worth the extra typing.

3. **`KNOWN_GAPS.md` as a forward-looking artifact means its first commit may be a "GAP resolved" commit** — counter-intuitive but correct. The file tracks deferred work for future sessions; its existence in the repo is itself the handoff mechanism, so landing it in a resolution commit is semantically consistent with "this gap was discovered, documented, and resolved in one session, and the record of that full lifecycle is the commit".

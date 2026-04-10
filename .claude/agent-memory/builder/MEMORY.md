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

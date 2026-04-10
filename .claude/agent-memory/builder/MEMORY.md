# Builder Agent Memory

## Project Structure (Post-Pivot - 2026-03-08)
- Project is now a pure orchestration system (no web UI)
- All UI code archived to `archive/web-ui` branch
- Main content: `.claude/` directory with agents, skills, hooks, rules
- Root `package.json` only has `bun test .claude/hooks/` script
- No web UI directory on main branch (archived to `archive/web-ui` branch)
- `CLAUDE.md` is a symlink from `~/.claude/CLAUDE.md` to this repo

## Key Patterns
- Linter auto-reformats on edit (biome or similar) - always re-read after edits for exact string matching

## Testing Notes
- Tests now only cover `.claude/hooks/` directory
- Run: `bun test .claude/hooks/`
- Stop hook at `.claude/hooks/validators/stop/validate-tests-pass.ts`
- `bunx --cwd owner/repo` is ambiguous - bunx treats it as GitHub specifier, use `bash -c 'cd dir && bunx cmd'`

## Bun mock.module Leaking (CRITICAL)
- `mock.module` in Bun 1.3.x is GLOBAL and PERSISTENT across all test files in a batch run
- Multiple test files mocking the same module (by resolved path) CONFLICT - last wins
- The mock REPLACES the entire module: any export not in the mock factory is MISSING
- `mock.module` has NO `restore()` - once set, it stays for the process lifetime
- **Fix pattern**: Use `spyOn(singleton, 'method')` instead of `mock.module` when possible
- **When mock.module is needed**: Include ALL exports the real module has, not just what you use
- Always add `afterAll(() => { spy.mockRestore() })` to restore spies

## Complexity Validator (CRITICAL)
- Threshold is 25, uses `>` (so 25 passes, 26 blocks)
- Counts per-FILE not per-function: `if(`, `else`, `for(`, `while(`, `case `, `catch(`, `&&`, `||`, `?(?!:)`
- `||` counts: `normalizeEntry` with 14 fallbacks = 14 complexity points. Use spread with defaults object instead
- `?.` optional chaining counts as `?` complexity (regex `?(?!:)` matches `?.` since `.` != `:`)
- Split large files into <25 complexity each; use barrel re-exports
- Test with: `bun .claude/hooks/lib/count-complexity.ts <file>` (if script exists)

## Syntax Validator (Pre-existing Bug)
- Runs `tsc --noEmit --pretty false <filePath>` which IGNORES tsconfig.json
- Any file using `Bun`, `process`, `Set`, `import.meta` will fail without `@types/bun`
- This is a pre-existing issue - not caused by new code
- tsconfig.json exists now with `moduleDetection: "force"` and `@types/bun` installed

## Typecheck Guard
- Runs `tsc --noEmit --project tsconfig.json` (project-wide)
- All files in `.claude/hooks/` are checked together
- `moduleDetection: "force"` prevents "duplicate function" errors between files with same function names
- Test files with inline `TestInput` interfaces must include ALL fields used (e.g., `command?: string`)

## Lessons Learned
- Windows paths with backslashes work in `cd` commands but need quoting
- Windows file locks can prevent `rm -rf` on empty directories - git still tracks deletions correctly
- When adding optional fields to interfaces used in existing code, no breaking changes occur
- `bun test` requires `./` prefix for dotfile directories: `bun test ./.claude/hooks/`
- Import paths in `.ts` files must NOT have `.ts` extension (syntax-validator blocks it)

---

## Legacy Insights (imported from EXPERTISE.md)

# Builder Expertise


## 2026-04-10 — Session 565ec942
- The `check-staleness` PreToolUse hook can get out of sync with the session's read cache: reading a file via Grep/small Read and then editing may trigger "never read in this session" even if tools show the file was recently read. Workaround: do a full `Read` of the file right before the Edit that fails.
- `bun test` output with `| tail` fails in Claude Code's bash shell since `tail` is not in PATH — pipe-less invocation works fine since Bun test output is usually short.
- Frontmatter edits in skill/agent files are safe no-op for tests: the `.claude/hooks/` test suite does not validate skill YAML schemas, so adding new fields like `paths:` or `initialPrompt:` will not break any existing tests.
- When multiple SKILL.md files share the closing pattern `for_agents: [...]\nversion: "X.Y"\n---`, Edit's uniqueness requirement is satisfied per-file (each file is edited independently), so identical `old_string` across files is fine.

## 2026-04-10 — Session 565ec942
- Claude Code hooks that run `main()` at module top-level must use `if (import.meta.main) main()` to be importable from tests without triggering side effects (network calls, stdin reads).
- The Claude Code hook output spec (2.1.94+) places `sessionTitle` as a sibling of `additionalContext` inside `hookSpecificOutput` — both coexist in the same `UserPromptSubmit` response, they are not mutually exclusive shapes.
- For testing hooks with complex import trees, prefer exporting pure helper functions (`buildSessionTitle`, `isFirstTurn`) and testing those directly rather than trying to mock stdin and the main entry point.
- "First turn" detection via transcript_path line count is a reliable heuristic: on turn 1 the transcript contains at most the current user message (<=1 non-empty line); defensive default on parse errors should be "not first turn" to avoid clobbering existing session titles.
- Bun test runner handles `bun test <path/to/single.test.ts>` cleanly for fast iteration, and `bun test ./.claude/hooks/` runs the full suite — the `./` prefix is required for dotfile directories.

## 2026-04-10 — Session 565ec942
- When extending `~/.claude/error-patterns.jsonl`, always route writes through `recordError()` rather than direct JSONL append — `savePatterns()` rewrites the entire file based on the `ErrorPattern` shape, silently deleting any foreign-shape lines on the next call.
- The project's complexity validator counts `?.`, `||`, `&&` per-file (not per-function) with a threshold of 25 — hook entry points with stdin parsing + defensive extraction often hit the limit, so split helpers into `lib/*-utils.ts` from the start instead of refactoring after a block.
- `bun test` requires a leading `./` for dotfile directories (`./.claude/hooks/...`) — without it, bun treats the path as a filter expression and reports "did not match any test files".
- Classifier regex ordering in `error-pattern-matching.ts` matters: more-specific prefixes (like `^\[tool-deny\]`) must come before broader text regexes (`permission denied`) or they get misclassified as the earlier entry.
- `ResolvedTraceEntry` / `AgentScore` shapes in this repo don't carry `sessionId` at the aggregated level — new miners that need per-session joins should define their own lightweight input interface rather than coupling to the scorer types.

## 2026-04-10 — Session 565ec942
- When anchoring a regex with `^`, always pair it with the `m` flag for multi-line buffers — without `/m`, `^` only matches position 0, which is almost never what you want for log-style prompts that have intro context before structured fields.
- `Bun.stdin.text()` is the idiomatic one-shot stdin reader in Bun (already used by `memory-inject.ts`); older `process.stdin.on("data")`/`on("end")` promise wrappers are verbose and error-prone — consolidate to a shared `lib/hook-stdin.ts` for best-effort hooks.
- The project's formatter (biome/similar) may reformat files immediately after Edit. When making multiple sequential edits to the same file, always `Read` again between edits to get the exact current whitespace — stale `old_string` targeting is a common failure mode.
- Order matters in `CATEGORY_REGEXES` ordered lists (`classifyError` returns on first match): document the ordering constraint with an inline comment on the first/overriding entry so future contributors don't reorder alphabetically and break classification.
- When adding a test for a regex change, write BOTH a negative case (what must no longer match) and a positive case (what must still match) — anchoring regexes often passes the happy path while breaking realistic multi-line inputs, or vice versa.

## 2026-04-10 — Session e7515341
- When Claude Code constraints are architectural (Skill() is Lead-only), stop trying to work around them and embrace the mechanism that already works (frontmatter pre-declaration)
- Empirical A/B tests beat theoretical purity: if one approach already produced 11 majors + 6 minors and the alternative produced 0, the decision is made
- "Apparent duplication" between global and project agents is often specialization in disguise — the file count is the same but the semantic payload differs
- EXPERTISE.md injection precedent does not automatically generalize to skill injection — expertise is ~3K tokens of condensed insights, skills can be 10K+ of patterns that bloat every delegation

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

# Builder Agent Memory

## Project Structure
- Server source: `claude-code-ui/server/src/`
- Utils: `claude-code-ui/server/src/utils/` (claude-path.ts, security.ts)
- Tests: co-located `*.test.ts` files
- Typecheck: `bun run typecheck` (runs `tsc --noEmit`)
- Tests: `bun test` from server dir

## Windows Bash
- Must quote paths with backslashes: `cd "D:\path"` not `cd D:\path`
- Without quotes, backslashes get stripped

## Pre-existing Test Failures (as of 2026-02-08)
- 32 tests fail before any changes (gemini mocks, memory exports, agent-spawner, learning-loop, codex, logger)
- Always compare test results against baseline to identify regressions

## Key Files
- `claude-path.ts`: Resolves Claude CLI path across platforms (env var > which > known paths)
- `security.ts`: PATH enrichment for spawned processes, safe env construction

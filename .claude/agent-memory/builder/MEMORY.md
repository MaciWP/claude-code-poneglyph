# Builder Agent Memory

## Project Structure
- Server code: `claude-code-ui/server/src/`
- Services: `claude-code-ui/server/src/services/`
- Tests: `claude-code-ui/server/src/__tests__/` and co-located `*.test.ts`

## Key Patterns
- Linter auto-reformats on edit (biome or similar) - always re-read after edits for exact string matching
- `OrchestratorAgent` is a class extending EventEmitter, not a factory function pattern
- `SpawnResult.extractedMeta` has `filesModified`, `filesRead`, `errors` arrays
- `SessionStateManager` uses Map<sessionId, SessionState> pattern

## Testing Notes
- Many pre-existing test failures (React tests need DOM, gemini mock broken, learning-loop timing)
- Orchestrator-agent tests at `server/src/__tests__/orchestrator-agent.test.ts` - 12 tests, all pass
- Always run `bun typecheck` first, then specific test files
- Full suite: server 619 pass, 4 fail (pre-existing), 1 skip; web 50 pass, 0 fail
- Stop hook at `.claude/hooks/validators/stop/validate-tests-pass.ts` runs per-subproject
- Hook has baseline tolerance: server=5 failures, web=0 (in `KNOWN_FAILURE_BASELINE`)
- `bunx --cwd owner/repo` is ambiguous - bunx treats it as GitHub specifier, use `bash -c 'cd dir && bunx cmd'`

## Bun mock.module Leaking (CRITICAL)
- `mock.module` in Bun 1.3.x is GLOBAL and PERSISTENT across all test files in a batch run
- Multiple test files mocking the same module (by resolved path) CONFLICT - last wins
- The mock REPLACES the entire module: any export not in the mock factory is MISSING
- `mock.module` has NO `restore()` - once set, it stays for the process lifetime
- **Fix pattern**: Use `spyOn(singleton, 'method')` instead of `mock.module` when possible
- **When mock.module is needed**: Include ALL exports the real module has, not just what you use
- Always add `afterAll(() => { spy.mockRestore() })` to restore spies
- Relative paths from different test files can resolve to the same module (e.g., `../logger` from `__tests__/` and `../logger` from `services/` both hit `src/logger.ts`)

## Lessons Learned
- Windows paths with backslashes work in `cd` commands but need quoting
- When adding optional fields to interfaces used in existing code, no breaking changes occur
- Pass new data through existing structures (e.g., `extractedMeta` on `AgentResult`) rather than creating parallel data flows

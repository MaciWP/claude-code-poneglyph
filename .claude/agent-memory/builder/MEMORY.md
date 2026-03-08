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

## Lessons Learned
- Windows paths with backslashes work in `cd` commands but need quoting
- Windows file locks can prevent `rm -rf` on empty directories - git still tracks deletions correctly
- When adding optional fields to interfaces used in existing code, no breaking changes occur

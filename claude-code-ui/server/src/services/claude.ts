/**
 * Claude Service
 *
 * This file re-exports from the modular claude/ directory for backwards compatibility.
 * All functionality has been split into:
 *   - claude/types.ts    - Type definitions
 *   - claude/parser.ts   - NDJSON parsing utilities
 *   - claude/cli.ts      - CLI execution (spawn process)
 *   - claude/index.ts    - Main exports and ClaudeService class
 */

export { ClaudeService, isValidCLIEvent, parseCLIOutput } from './claude/index'

export type {
  CLIOptions,
  CLIResult,
  CLIStreamEvent,
  CLIJsonOutput,
  ActiveTaskInfo,
  StreamChunk,
} from './claude/index'

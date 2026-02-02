/**
 * Claude Service Module
 *
 * Main entry point for Claude SDK and CLI execution.
 * Re-exports all types and provides the ClaudeService class.
 */

// Re-export all types
export type {
  ExecuteOptions,
  ExecuteResult,
  CLIOptions,
  CLIResult,
  CLIStreamEvent,
  CLIJsonOutput,
  ActiveTaskInfo,
} from './types'

// Re-export StreamChunk from shared types
export type { StreamChunk } from '@shared/types'

// Re-export parser utilities
export { isValidCLIEvent, parseCLIOutput } from './parser'

// Import implementations
import { executeWithSDK, streamWithSDK } from './sdk'
import { executeWithCLI, streamCLI, streamCLIWithAbort } from './cli'
import type { ExecuteOptions, ExecuteResult, CLIOptions, CLIResult } from './types'
import type { StreamChunk } from '@shared/types'

/**
 * ClaudeService class providing both SDK and CLI execution modes.
 *
 * This class wraps the module functions to maintain backwards compatibility
 * with existing code that uses `new ClaudeService()`.
 */
export class ClaudeService {
  /**
   * Execute a prompt using the Claude SDK (one-shot mode).
   */
  async execute(options: ExecuteOptions): Promise<ExecuteResult> {
    return executeWithSDK(options)
  }

  /**
   * Execute a prompt using the Claude CLI (one-shot mode).
   */
  async executeCLI(options: CLIOptions): Promise<CLIResult> {
    return executeWithCLI(options)
  }

  /**
   * Stream execution using the Claude CLI.
   */
  async *streamCLI(options: CLIOptions): AsyncGenerator<StreamChunk> {
    yield* streamCLI(options)
  }

  /**
   * Stream execution with abort support and user answer handling.
   */
  streamCLIWithAbort(options: CLIOptions): {
    stream: AsyncGenerator<StreamChunk>
    abort: () => void
    sendUserAnswer: (answer: string) => void
  } {
    return streamCLIWithAbort(options)
  }

  /**
   * Stream execution using the Claude SDK.
   */
  async *stream(options: ExecuteOptions): AsyncGenerator<StreamChunk> {
    yield* streamWithSDK(options)
  }
}

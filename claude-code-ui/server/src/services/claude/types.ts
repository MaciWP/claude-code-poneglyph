/**
 * Claude Service Types
 *
 * All interfaces and types for Claude SDK and CLI execution.
 * This module has no dependencies on other claude/* modules to avoid circular imports.
 */

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import type { Message } from '@shared/types'

// Re-export StreamChunk from shared types for convenience
export type { StreamChunk } from '@shared/types'

// =============================================================================
// SDK TYPES
// =============================================================================

export interface ExecuteOptions {
  prompt: string
  sessionId?: string
  workDir?: string
  tools?: string[]
  resume?: string
  allowFullPC?: boolean
  bypassPermissions?: boolean
}

export interface ExecuteResult {
  response: string
  messages: SDKMessage[]
  sessionId: string
  toolsUsed: string[]
  tokensUsed?: number
  costUsd?: number
  mode: 'sdk' | 'cli'
}

// =============================================================================
// CLI TYPES
// =============================================================================

export interface CLIOptions {
  prompt: string
  messages?: Message[] // Full conversation history for context restoration
  sessionId?: string
  sessionFilePath?: string // Path to session file for context reference
  workDir?: string
  outputFormat?: 'json' | 'stream-json' | 'text'
  continue?: boolean
  resume?: string
  allowedTools?: string[]
  images?: string[] // Array of image file paths
  bypassPermissions?: boolean
  thinking?: boolean
  planMode?: boolean
  orchestrate?: boolean
  allowFullPC?: boolean
  abortSignal?: AbortSignal
}

export interface CLIResult {
  response: string
  sessionId: string
  toolsUsed: string[]
  costUsd?: number
  durationMs?: number
  mode: 'cli'
}

// =============================================================================
// CLI STREAM EVENT TYPES (NDJSON)
// =============================================================================

export interface CLIStreamEvent {
  type: string
  subtype?: string
  session_id?: string

  // For init
  cwd?: string
  model?: string
  tools?: string[]

  // For assistant/message
  message?: {
    content: Array<{
      type: string
      text?: string
      name?: string
      input?: unknown
      id?: string // tool_use_id in tool_use blocks
      tool_use_id?: string // tool_use_id in tool_result blocks
    }>
  }

  // For tool_use
  tool_name?: string
  tool_input?: unknown
  tool_use_id?: string

  // For tool_result
  output?: string

  // For result
  result?: string
  total_cost_usd?: number
  duration_ms?: number
  is_error?: boolean
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }

  // For control_request (permission requests from subagents)
  request_id?: string
  request?: {
    subtype?: string
    tool_name?: string
    input?: Record<string, unknown>
    tool_use_id?: string
    agent_id?: string
  }
}

export interface CLIJsonOutput {
  type?: string
  result?: string
  session_id?: string
  tool_name?: string
  cost_usd?: number
  duration_ms?: number
}

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Info for tracking active Task tools for parent correlation
 */
export interface ActiveTaskInfo {
  parentTaskId: string | undefined
  startTime: number
}

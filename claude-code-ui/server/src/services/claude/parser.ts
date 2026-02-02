/**
 * Claude CLI Output Parser
 *
 * Utilities for parsing NDJSON output from Claude CLI.
 */

import type { CLIStreamEvent, CLIJsonOutput, CLIResult } from './types'

/**
 * Validates that an unknown value is a valid CLI stream event.
 * Minimal validation: only verifies it's an object with a string type property.
 * Individual blocks are validated in processEvent with try-catch.
 */
export function isValidCLIEvent(event: unknown): event is CLIStreamEvent {
  if (!event || typeof event !== 'object') return false
  if (!('type' in event)) return false
  const eventType = (event as { type: unknown }).type
  if (typeof eventType !== 'string') return false
  return true
}

/**
 * Parses CLI JSON output into a structured result.
 * Handles both JSON format (line-by-line NDJSON) and plain text.
 */
export function parseCLIOutput(
  output: string,
  format: string,
  fallbackSessionId?: string
): CLIResult {
  if (format === 'json') {
    const lines = output.trim().split('\n')
    let response = ''
    let sessionId = ''
    const toolsUsed: string[] = []
    let costUsd: number | undefined
    let durationMs: number | undefined

    for (const line of lines) {
      try {
        const parsed: CLIJsonOutput = JSON.parse(line)

        if (parsed.type === 'result' && parsed.result) {
          response = parsed.result
        }
        if (parsed.session_id) {
          sessionId = parsed.session_id
        }
        if (parsed.type === 'tool_use' && parsed.tool_name) {
          if (!toolsUsed.includes(parsed.tool_name)) {
            toolsUsed.push(parsed.tool_name)
          }
        }
        if (parsed.cost_usd !== undefined) {
          costUsd = parsed.cost_usd
        }
        if (parsed.duration_ms !== undefined) {
          durationMs = parsed.duration_ms
        }
      } catch {
        // Line is not valid JSON, treat as plain text response (expected for non-JSON output)
        if (!response && line.trim()) {
          response += line + '\n'
        }
      }
    }

    return {
      response: response.trim(),
      sessionId: sessionId || fallbackSessionId || crypto.randomUUID(),
      toolsUsed,
      costUsd,
      durationMs,
      mode: 'cli',
    }
  }

  // Plain text format
  return {
    response: output.trim(),
    sessionId: fallbackSessionId || crypto.randomUUID(),
    toolsUsed: [],
    mode: 'cli',
  }
}

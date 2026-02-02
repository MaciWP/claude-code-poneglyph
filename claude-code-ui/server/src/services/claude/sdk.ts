/**
 * Claude SDK Execution
 *
 * Handles execution via the Anthropic Claude Agent SDK.
 * Provides both one-shot execution and streaming modes.
 */

import {
  query,
  type SDKResultMessage,
  type SDKAssistantMessage,
  type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk'
import { logger } from '../../logger'
import { validateWorkDir, getSafeEnvForClaude } from '../../utils/security'
import type { ExecuteOptions, ExecuteResult } from './types'
import type { StreamChunk } from '@shared/types'

const log = logger.child('claude-sdk')

/**
 * Execute a prompt using the Claude SDK (one-shot mode).
 * Collects all messages and returns the final result.
 */
export async function executeWithSDK(options: ExecuteOptions): Promise<ExecuteResult> {
  log.debug('SDK execute start', {
    prompt: options.prompt.slice(0, 100),
    workDir: options.workDir,
    resume: options.resume,
  })

  const messages: import('@anthropic-ai/claude-agent-sdk').SDKMessage[] = []
  const toolsUsed: string[] = []
  let response = ''
  let sessionId = ''
  let costUsd = 0

  try {
    log.debug('SDK query calling', {
      cwd: options.workDir || process.cwd(),
      resume: options.resume,
    })

    const queryGenerator = query({
      prompt: options.prompt,
      options: {
        cwd: validateWorkDir(options.workDir, { allowFullPC: options.allowFullPC }),
        allowedTools: options.tools,
        permissionMode: options.bypassPermissions !== false ? 'bypassPermissions' : 'default',
        allowDangerouslySkipPermissions: options.bypassPermissions !== false,
        resume: options.resume,
        env: getSafeEnvForClaude(),
      },
    })

    for await (const msg of queryGenerator) {
      log.debug('SDK message', { type: msg.type, sessionId: msg.session_id })
      messages.push(msg)
      sessionId = msg.session_id || sessionId

      if (msg.type === 'assistant') {
        const assistantMsg = msg as SDKAssistantMessage
        if (!Array.isArray(assistantMsg.message?.content)) continue
        for (const block of assistantMsg.message.content) {
          if (!block || typeof block !== 'object' || !('type' in block)) continue
          if (block.type === 'text') {
            response += block.text
          } else if (block.type === 'tool_use') {
            if (!toolsUsed.includes(block.name)) {
              toolsUsed.push(block.name)
            }
          }
        }
      } else if (msg.type === 'result') {
        const resultMsg = msg as SDKResultMessage
        if (resultMsg.subtype === 'success') {
          response = resultMsg.result
          costUsd = resultMsg.total_cost_usd
        }
        log.debug('SDK result', {
          subtype: resultMsg.subtype,
          result: resultMsg.subtype === 'success' ? resultMsg.result.slice(0, 100) : undefined,
          costUsd: resultMsg.total_cost_usd,
        })
      }
    }

    log.info('SDK execute success', {
      responseLength: response.length,
      messagesCount: messages.length,
      toolsUsed,
      sessionId,
      costUsd,
    })

    return {
      response,
      messages,
      sessionId: sessionId || crypto.randomUUID(),
      toolsUsed,
      costUsd,
      mode: 'sdk',
    }
  } catch (error) {
    log.error('SDK execute error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw new Error(
      `Claude SDK execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Stream execution using the Claude SDK.
 * Yields StreamChunks as messages arrive.
 */
export async function* streamWithSDK(options: ExecuteOptions): AsyncGenerator<StreamChunk> {
  log.debug('SDK stream start', {
    prompt: options.prompt.slice(0, 100),
    resume: options.resume,
  })
  const toolNameStack: string[] = [] // Stack to associate tool_use with tool_result (supports nesting)

  try {
    const queryGenerator = query({
      prompt: options.prompt,
      options: {
        cwd: validateWorkDir(options.workDir, { allowFullPC: options.allowFullPC }),
        allowedTools: options.tools,
        permissionMode: options.bypassPermissions !== false ? 'bypassPermissions' : 'default',
        allowDangerouslySkipPermissions: options.bypassPermissions !== false,
        includePartialMessages: true,
        resume: options.resume,
        env: getSafeEnvForClaude(),
      },
    })

    for await (const msg of queryGenerator) {
      log.debug('SDK stream message', { type: msg.type })

      if (msg.type === 'system') {
        yield {
          type: 'init',
          data: '',
          sessionId: msg.session_id,
        }
      } else if (msg.type === 'stream_event') {
        // Handle streaming events (partial messages)
        const streamMsg = msg as {
          type: 'stream_event'
          session_id: string
          event: { type: string; delta?: { type: string; text?: string } }
        }
        if (
          streamMsg.event?.type === 'content_block_delta' &&
          streamMsg.event.delta?.type === 'text_delta'
        ) {
          yield {
            type: 'text',
            data: streamMsg.event.delta.text || '',
            sessionId: msg.session_id,
          }
        } else if (
          streamMsg.event?.type === 'content_block_delta' &&
          streamMsg.event.delta?.type === 'thinking_delta'
        ) {
          yield {
            type: 'thinking',
            data: (streamMsg.event.delta as { text?: string }).text || '',
            sessionId: msg.session_id,
          }
        }
      } else if (msg.type === 'assistant') {
        const assistantMsg = msg as SDKAssistantMessage
        if (!Array.isArray(assistantMsg.message?.content)) continue
        for (const block of assistantMsg.message.content) {
          if (!block || typeof block !== 'object' || !('type' in block)) continue
          if (block.type === 'text') {
            // Skip - already handled by stream_event
          } else if (block.type === 'thinking') {
            // Skip - already handled by stream_event
          } else if (block.type === 'tool_use') {
            toolNameStack.push(block.name) // Push for matching with tool_result
            yield {
              type: 'tool_use',
              data: block.name,
              tool: block.name,
              toolInput: block.input,
              sessionId: msg.session_id,
            }
          }
        }
      } else if (msg.type === 'user') {
        // Tool results come as user messages
        const userMsg = msg as SDKUserMessage
        if (userMsg.message?.content && Array.isArray(userMsg.message.content)) {
          for (const block of userMsg.message.content) {
            if (!block || typeof block !== 'object' || !('type' in block)) continue
            if (block.type === 'tool_result') {
              yield {
                type: 'tool_result',
                data: 'completed',
                toolOutput:
                  typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
                tool: toolNameStack.pop() || undefined, // Pop for matching with tool_use
                sessionId: msg.session_id,
              }
              // Stack auto-empties with pop()
            }
          }
        }
      } else if (msg.type === 'result') {
        const resultMsg = msg as SDKResultMessage
        yield {
          type: 'result',
          data: resultMsg.subtype === 'success' ? resultMsg.result : '',
          sessionId: msg.session_id,
          costUsd: resultMsg.total_cost_usd,
          durationMs: resultMsg.duration_ms,
        }
      }
    }

    yield { type: 'done', data: '' }
  } catch (error) {
    log.error('SDK stream error', {
      error: error instanceof Error ? error.message : String(error),
    })
    yield {
      type: 'error',
      data: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

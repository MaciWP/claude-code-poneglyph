/**
 * CLI Stream Processor
 *
 * Coordinates NDJSON stream reading and event processing.
 */

import { logger } from '../../logger'
import { isValidCLIEvent } from './parser'
import {
  handleInitEvent,
  handleAssistantEvent,
  handleUserEvent,
  handleResultEvent,
  handleControlRequestEvent,
  type StreamProcessorState,
} from './event-handlers'
import type { CLIOptions, CLIStreamEvent } from './types'
import type { StreamChunk } from '@shared/types'

const log = logger.child('claude-cli-processor')

// Re-export state utilities
export { createProcessorState, type StreamProcessorState } from './event-handlers'

// =============================================================================
// EVENT PROCESSING
// =============================================================================

/**
 * Processes a single CLI stream event and pushes appropriate chunks.
 */
export async function processStreamEvent(
  event: CLIStreamEvent,
  state: StreamProcessorState,
  options: CLIOptions,
  push: (chunk: StreamChunk) => void,
  sendAnswerToProc: (answer: string) => void,
  setAnswerResolver?: (resolver: (answer: string) => void) => void,
  getProc?: () => ReturnType<typeof Bun.spawn> | null
): Promise<void> {
  if (event.type === 'system' && event.subtype === 'init') {
    await handleInitEvent(event, options, push)
  } else if (event.type === 'assistant') {
    await handleAssistantEvent(event, state, push, sendAnswerToProc, setAnswerResolver)
  } else if (event.type === 'user' && event.message?.content && Array.isArray(event.message.content)) {
    handleUserEvent(event, state, push)
  } else if (event.type === 'result') {
    handleResultEvent(event, push, getProc)
  } else if (event.type === 'control_request' && event.request?.subtype === 'can_use_tool') {
    handleControlRequestEvent(event, options, getProc)
  }
}

// =============================================================================
// NDJSON STREAM READER
// =============================================================================

/**
 * Creates a stream reader that processes NDJSON events.
 * Starts reading asynchronously and calls onComplete when done.
 */
export function createStreamReader(
  stream: ReadableStream,
  isStderr: boolean,
  state: StreamProcessorState,
  options: CLIOptions,
  push: (chunk: StreamChunk) => void,
  sendAnswerToProc: (answer: string) => void,
  isAborted: () => boolean,
  onComplete: () => void,
  setAnswerResolver?: (resolver: (answer: string) => void) => void,
  getProc?: () => ReturnType<typeof Bun.spawn> | null
): void {
  readStream(
    stream,
    isStderr,
    state,
    options,
    push,
    sendAnswerToProc,
    isAborted,
    onComplete,
    setAnswerResolver,
    getProc
  )
}

/**
 * Internal async function that reads and processes the stream.
 */
async function readStream(
  stream: ReadableStream,
  isStderr: boolean,
  state: StreamProcessorState,
  options: CLIOptions,
  push: (chunk: StreamChunk) => void,
  sendAnswerToProc: (answer: string) => void,
  isAborted: () => boolean,
  onComplete: () => void,
  setAnswerResolver?: (resolver: (answer: string) => void) => void,
  getProc?: () => ReturnType<typeof Bun.spawn> | null
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (isAborted()) {
        reader.cancel()
        break
      }
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })

      if (isStderr) {
        if (chunk.trim()) {
          log.warn('CLI stderr', { text: chunk })
        }
      } else {
        buffer = await processNDJSONBuffer(
          buffer + chunk,
          state,
          options,
          push,
          sendAnswerToProc,
          setAnswerResolver,
          getProc
        )
      }
    }

    // Process remaining buffer (stdout only)
    if (!isStderr && buffer.trim()) {
      await processRemainingBuffer(
        buffer,
        state,
        options,
        push,
        sendAnswerToProc,
        setAnswerResolver,
        getProc
      )
    }
  } catch (error) {
    log.error(`CLI stream error (${isStderr ? 'stderr' : 'stdout'})`, {
      error: String(error),
    })
    push({ type: 'error', data: String(error) })
  } finally {
    onComplete()
  }
}

/**
 * Processes NDJSON lines from buffer, returns remaining incomplete data.
 */
async function processNDJSONBuffer(
  buffer: string,
  state: StreamProcessorState,
  options: CLIOptions,
  push: (chunk: StreamChunk) => void,
  sendAnswerToProc: (answer: string) => void,
  setAnswerResolver?: (resolver: (answer: string) => void) => void,
  getProc?: () => ReturnType<typeof Bun.spawn> | null
): Promise<string> {
  let newlineIdx: number
  while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newlineIdx)
    buffer = buffer.slice(newlineIdx + 1)

    if (!line.trim()) continue

    try {
      const event: CLIStreamEvent = JSON.parse(line)
      if (isValidCLIEvent(event)) {
        log.debug('CLI stream event', { type: event.type, subtype: event.subtype })
        await processStreamEvent(
          event,
          state,
          options,
          push,
          sendAnswerToProc,
          setAnswerResolver,
          getProc
        )
      } else {
        log.warn('CLI stream invalid event structure', {
          type: (event as { type?: string }).type,
        })
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        // Re-add line to buffer for re-accumulation
        buffer = line + buffer
        log.debug('CLI stream JSON incomplete, re-accumulating', {
          lineLength: line.length,
          errorMsg: e.message.slice(0, 50),
        })
        break
      }
      log.warn('CLI stream processing error', {
        eventType: 'unknown',
        error: String(e).slice(0, 100),
        linePreview: line.slice(0, 80),
      })
    }
  }

  return buffer
}

/**
 * Attempts to process any remaining data in the buffer.
 */
async function processRemainingBuffer(
  buffer: string,
  state: StreamProcessorState,
  options: CLIOptions,
  push: (chunk: StreamChunk) => void,
  sendAnswerToProc: (answer: string) => void,
  setAnswerResolver?: (resolver: (answer: string) => void) => void,
  getProc?: () => ReturnType<typeof Bun.spawn> | null
): Promise<void> {
  try {
    const event: CLIStreamEvent = JSON.parse(buffer)
    await processStreamEvent(
      event,
      state,
      options,
      push,
      sendAnswerToProc,
      setAnswerResolver,
      getProc
    )
  } catch {
    log.debug('Failed to parse remaining buffer as JSON', {
      buffer: buffer.slice(0, 100),
    })
  }
}

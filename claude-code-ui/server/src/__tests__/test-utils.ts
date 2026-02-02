/**
 * Test Utilities
 *
 * Shared utilities for server-side testing.
 * Pattern: Factory functions for creating test data with sensible defaults.
 *
 * @example
 * import { createMockSession, createMockMessage, createMockStreamChunk } from '../__tests__/test-utils'
 *
 * const session = createMockSession({ name: 'Custom Name' })
 * const message = createMockMessage({ role: 'assistant', content: 'Hello' })
 */

import { mock } from 'bun:test'
import type { Session, Message, StreamChunk } from '@shared/types'

// Extended Session type that includes UI-specific fields
export interface ExtendedSession extends Session {
  provider?: 'claude' | 'codex' | 'gemini'
  modes?: {
    orchestrate: boolean
    plan: boolean
    bypassPermissions: boolean
  }
}

// Extended Message type that includes optional id
export interface ExtendedMessage extends Message {
  id?: string
}

// ============================================================================
// Session Factories
// ============================================================================

/**
 * Creates a mock session with sensible defaults
 */
export function createMockSession(overrides?: Partial<ExtendedSession>): ExtendedSession {
  const now = new Date().toISOString()
  return {
    id: `session-${crypto.randomUUID().slice(0, 8)}`,
    name: 'Test Session',
    createdAt: now,
    updatedAt: now,
    workDir: '/test/work/dir',
    messages: [],
    provider: 'claude',
    modes: {
      orchestrate: false,
      plan: false,
      bypassPermissions: true,
    },
    ...overrides,
  }
}

// ============================================================================
// Message Factories
// ============================================================================

/**
 * Creates a mock message with sensible defaults
 */
export function createMockMessage(overrides?: Partial<ExtendedMessage>): ExtendedMessage {
  return {
    id: `msg-${crypto.randomUUID().slice(0, 8)}`,
    role: 'user',
    content: 'Test message content',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Creates a mock assistant message
 */
export function createMockAssistantMessage(
  content: string,
  overrides?: Partial<Message>
): Message {
  return createMockMessage({
    role: 'assistant',
    content,
    toolsUsed: [],
    ...overrides,
  })
}

/**
 * Creates a mock user message
 */
export function createMockUserMessage(
  content: string,
  overrides?: Partial<Message>
): Message {
  return createMockMessage({
    role: 'user',
    content,
    ...overrides,
  })
}

// ============================================================================
// StreamChunk Factories
// ============================================================================

/**
 * Creates a mock stream chunk with sensible defaults
 */
export function createMockStreamChunk(
  type: StreamChunk['type'],
  data: string,
  overrides?: Partial<StreamChunk>
): StreamChunk {
  return {
    type,
    data,
    sessionId: `session-${crypto.randomUUID().slice(0, 8)}`,
    ...overrides,
  } as StreamChunk
}

/**
 * Creates a text stream chunk
 */
export function createTextChunk(text: string, sessionId?: string): StreamChunk {
  return createMockStreamChunk('text', text, { sessionId })
}

/**
 * Creates a tool_use stream chunk
 */
export function createToolUseChunk(
  toolName: string,
  toolInput?: unknown,
  sessionId?: string
): StreamChunk {
  return {
    type: 'tool_use',
    data: toolName,
    tool: toolName,
    toolInput,
    toolUseId: `tool-${crypto.randomUUID().slice(0, 8)}`,
    sessionId: sessionId || `session-${crypto.randomUUID().slice(0, 8)}`,
  }
}

/**
 * Creates a tool_result stream chunk
 */
export function createToolResultChunk(
  toolName: string,
  output: string,
  sessionId?: string
): StreamChunk {
  return {
    type: 'tool_result',
    data: 'completed',
    tool: toolName,
    toolOutput: output,
    sessionId: sessionId || `session-${crypto.randomUUID().slice(0, 8)}`,
  }
}

/**
 * Creates a result stream chunk (final response)
 */
export function createResultChunk(
  result: string,
  sessionId?: string,
  usage?: {
    inputTokens: number
    outputTokens: number
  }
): StreamChunk {
  return {
    type: 'result',
    data: result,
    sessionId: sessionId || `session-${crypto.randomUUID().slice(0, 8)}`,
    costUsd: 0.01,
    durationMs: 1000,
    usage: usage
      ? {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          totalTokens: usage.inputTokens + usage.outputTokens,
          contextPercent: ((usage.inputTokens + usage.outputTokens) / 200000) * 100,
        }
      : undefined,
  }
}

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Creates a mock ReadableStream that yields given chunks
 */
export function createMockReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]))
        index++
      } else {
        controller.close()
      }
    },
  })
}

/**
 * Creates a mock Bun.spawn process
 */
export function createMockProcess(options: {
  stdout?: string | string[]
  stderr?: string
  exitCode?: number
}): ReturnType<typeof Bun.spawn> {
  const stdoutChunks = Array.isArray(options.stdout)
    ? options.stdout
    : options.stdout
      ? [options.stdout]
      : []

  return {
    pid: 12345,
    stdout: createMockReadableStream(stdoutChunks),
    stderr: createMockReadableStream(options.stderr ? [options.stderr] : []),
    stdin: null,
    exited: Promise.resolve(options.exitCode ?? 0),
    exitCode: options.exitCode ?? 0,
    signalCode: null,
    killed: false,
    kill: mock(() => {}),
    ref: mock(() => {}),
    unref: mock(() => {}),
  } as unknown as ReturnType<typeof Bun.spawn>
}

/**
 * Creates a mock async generator that yields given values
 */
export async function* createMockAsyncGenerator<T>(values: T[]): AsyncGenerator<T> {
  for (const value of values) {
    yield value
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Waits for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await Bun.sleep(interval)
  }
  throw new Error(`waitFor timed out after ${timeout}ms`)
}

/**
 * Collects all values from an async generator
 */
export async function collectAsyncGenerator<T>(generator: AsyncGenerator<T>): Promise<T[]> {
  const results: T[] = []
  for await (const value of generator) {
    results.push(value)
  }
  return results
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Creates a deferred promise that can be resolved/rejected externally
 */
export function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

// ============================================================================
// File System Helpers (for integration tests)
// ============================================================================

import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Creates a unique temp directory path for tests
 */
export function createTempDir(prefix = 'test'): string {
  return join(tmpdir(), `${prefix}-${crypto.randomUUID()}`)
}

/**
 * Writes test files to a directory
 */
export async function writeTestFiles(
  baseDir: string,
  files: Record<string, string>
): Promise<void> {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(baseDir, relativePath)
    await Bun.write(fullPath, content)
  }
}

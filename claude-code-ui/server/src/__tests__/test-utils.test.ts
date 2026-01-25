/**
 * Tests for Test Utilities
 *
 * Validates that the test utilities work correctly.
 * Also serves as documentation for how to use them.
 */

import { describe, test, expect } from 'bun:test'
import {
  createMockSession,
  createMockMessage,
  createMockAssistantMessage,
  createMockUserMessage,
  createTextChunk,
  createToolUseChunk,
  createToolResultChunk,
  createResultChunk,
  createMockReadableStream,
  createMockProcess,
  createMockAsyncGenerator,
  waitFor,
  collectAsyncGenerator,
  createDeferred,
  createTempDir,
} from './test-utils'

describe('Test Utilities', () => {
  describe('Session Factories', () => {
    test('createMockSession creates session with defaults', () => {
      const session = createMockSession()

      expect(session.id).toContain('session-')
      expect(session.name).toBe('Test Session')
      expect(session.messages).toEqual([])
      expect(session.provider).toBe('claude')
    })

    test('createMockSession accepts overrides', () => {
      const session = createMockSession({
        name: 'Custom Session',
        provider: 'codex',
      })

      expect(session.name).toBe('Custom Session')
      expect(session.provider).toBe('codex')
    })
  })

  describe('Message Factories', () => {
    test('createMockMessage creates message with defaults', () => {
      const message = createMockMessage()

      expect(message.id).toContain('msg-')
      expect(message.role).toBe('user')
      expect(message.content).toBe('Test message content')
      expect(message.timestamp).toBeDefined()
    })

    test('createMockAssistantMessage creates assistant message', () => {
      const message = createMockAssistantMessage('Hello from assistant')

      expect(message.role).toBe('assistant')
      expect(message.content).toBe('Hello from assistant')
      expect(message.toolsUsed).toEqual([])
    })

    test('createMockUserMessage creates user message', () => {
      const message = createMockUserMessage('Hello from user')

      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello from user')
    })
  })

  describe('StreamChunk Factories', () => {
    test('createTextChunk creates text chunk', () => {
      const chunk = createTextChunk('Hello world')

      expect(chunk.type).toBe('text')
      expect(chunk.data).toBe('Hello world')
    })

    test('createToolUseChunk creates tool_use chunk', () => {
      const chunk = createToolUseChunk('Read', { file_path: '/test.txt' })

      expect(chunk.type).toBe('tool_use')
      expect(chunk.tool).toBe('Read')
      expect(chunk.toolInput).toEqual({ file_path: '/test.txt' })
      expect(chunk.toolUseId).toContain('tool-')
    })

    test('createToolResultChunk creates tool_result chunk', () => {
      const chunk = createToolResultChunk('Read', 'file contents')

      expect(chunk.type).toBe('tool_result')
      expect(chunk.tool).toBe('Read')
      expect(chunk.toolOutput).toBe('file contents')
    })

    test('createResultChunk creates result chunk', () => {
      const chunk = createResultChunk('Final response', 'test-session')

      expect(chunk.type).toBe('result')
      expect(chunk.data).toBe('Final response')
      expect(chunk.sessionId).toBe('test-session')
      expect(chunk.costUsd).toBe(0.01)
    })

    test('createResultChunk includes usage when provided', () => {
      const chunk = createResultChunk('Response', 'sess', {
        inputTokens: 100,
        outputTokens: 50,
      })

      expect(chunk.usage).toBeDefined()
      expect(chunk.usage?.inputTokens).toBe(100)
      expect(chunk.usage?.outputTokens).toBe(50)
      expect(chunk.usage?.totalTokens).toBe(150)
    })
  })

  describe('Mock Factories', () => {
    test('createMockReadableStream yields chunks', async () => {
      const stream = createMockReadableStream(['chunk1', 'chunk2', 'chunk3'])
      const reader = stream.getReader()
      const decoder = new TextDecoder()

      const results: string[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        results.push(decoder.decode(value))
      }

      expect(results).toEqual(['chunk1', 'chunk2', 'chunk3'])
    })

    test('createMockProcess creates process with stdout', async () => {
      const proc = createMockProcess({ stdout: 'output', exitCode: 0 })

      // Cast to ReadableStream since our mock always returns a stream
      const stdout = await new Response(proc.stdout as ReadableStream).text()
      const exitCode = await proc.exited

      expect(stdout).toBe('output')
      expect(exitCode).toBe(0)
    })

    test('createMockAsyncGenerator yields values', async () => {
      const gen = createMockAsyncGenerator([1, 2, 3])
      const results = await collectAsyncGenerator(gen)

      expect(results).toEqual([1, 2, 3])
    })
  })

  describe('Assertion Helpers', () => {
    test('waitFor resolves when condition is true', async () => {
      let ready = false
      setTimeout(() => {
        ready = true
      }, 50)

      await waitFor(() => ready, 1000)
      expect(ready).toBe(true)
    })

    test('waitFor rejects on timeout', async () => {
      await expect(waitFor(() => false, 100, 10)).rejects.toThrow('timed out')
    })

    test('collectAsyncGenerator collects all values', async () => {
      async function* gen() {
        yield 'a'
        yield 'b'
        yield 'c'
      }

      const results = await collectAsyncGenerator(gen())
      expect(results).toEqual(['a', 'b', 'c'])
    })
  })

  describe('Time Utilities', () => {
    test('createDeferred creates externally resolvable promise', async () => {
      const deferred = createDeferred<string>()

      // Resolve from outside
      setTimeout(() => deferred.resolve('done'), 10)

      const result = await deferred.promise
      expect(result).toBe('done')
    })

    test('createDeferred can be rejected', async () => {
      const deferred = createDeferred<string>()

      setTimeout(() => deferred.reject(new Error('failed')), 10)

      await expect(deferred.promise).rejects.toThrow('failed')
    })
  })

  describe('File System Helpers', () => {
    test('createTempDir creates unique path', () => {
      const dir1 = createTempDir()
      const dir2 = createTempDir()

      expect(dir1).not.toBe(dir2)
      expect(dir1).toContain('test-')
    })

    test('createTempDir accepts prefix', () => {
      const dir = createTempDir('custom')

      expect(dir).toContain('custom-')
    })
  })
})

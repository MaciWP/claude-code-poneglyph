import { describe, test, expect, mock, beforeEach } from 'bun:test'

// Mock claude-path to prevent Bun.spawn inside getClaudeCommand/findViaWhich
// which would consume the mock ReadableStream before the actual test code
mock.module('../utils/claude-path', () => ({
  getClaudePath: async () => '/mock/claude',
  getClaudeCommand: async () => ['/mock/claude'],
  getNodePath: () => 'node',
  clearClaudePathCache: () => {},
  diagnoseClaudePath: async () => ({
    resolved: '/mock/claude',
    inPath: true,
    knownPaths: [],
    env: {},
  }),
}))

import { ClaudeService, type StreamChunk } from './claude'

describe('ClaudeService', () => {
  let service: ClaudeService

  beforeEach(() => {
    service = new ClaudeService()
  })

  describe('executeCLI()', () => {
    test('spawns claude with correct arguments', async () => {
      const mockStdout = JSON.stringify({
        type: 'result',
        result: 'Hello from Claude',
        session_id: 'test-session-123',
      })

      const mockProc = {
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(mockStdout))
            controller.close()
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close()
          },
        }),
        exited: Promise.resolve(0),
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as ReturnType<typeof Bun.spawn>)

      try {
        const result = await service.executeCLI({
          prompt: 'Hello',
          workDir: '/test/dir',
        })

        expect(Bun.spawn).toHaveBeenCalled()
        const callArgs = (Bun.spawn as ReturnType<typeof mock>).mock.calls[0][0]
        expect(callArgs).toContain('/mock/claude')
        expect(callArgs).toContain('-p')
        expect(callArgs).toContain('Hello')
        expect(callArgs).toContain('--output-format')
        expect(callArgs).toContain('json')
        expect(callArgs).toContain('--dangerously-skip-permissions')

        expect(result.response).toBe('Hello from Claude')
        expect(result.sessionId).toBe('test-session-123')
        expect(result.mode).toBe('cli')
      } finally {
        Bun.spawn = originalSpawn
      }
    })

    test('includes resume flag when provided', async () => {
      const mockStdout = JSON.stringify({ type: 'result', result: 'OK' })

      const mockProc = {
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(mockStdout))
            controller.close()
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close()
          },
        }),
        exited: Promise.resolve(0),
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as ReturnType<typeof Bun.spawn>)

      try {
        await service.executeCLI({
          prompt: 'Continue',
          resume: 'previous-session-id',
        })

        const callArgs = (Bun.spawn as ReturnType<typeof mock>).mock.calls[0][0]
        expect(callArgs).toContain('--resume')
        expect(callArgs).toContain('previous-session-id')
      } finally {
        Bun.spawn = originalSpawn
      }
    })

    test('throws error when CLI exits with non-zero code', async () => {
      const mockProc = {
        stdout: new ReadableStream({
          start(controller) {
            controller.close()
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('Error: Something went wrong'))
            controller.close()
          },
        }),
        exited: Promise.resolve(1),
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as ReturnType<typeof Bun.spawn>)

      try {
        await expect(service.executeCLI({ prompt: 'Fail' })).rejects.toThrow(
          'Error: Something went wrong'
        )
      } finally {
        Bun.spawn = originalSpawn
      }
    })

    test('parses tool_use events from output', async () => {
      const mockStdout = [
        JSON.stringify({ type: 'tool_use', tool_name: 'Read' }),
        JSON.stringify({ type: 'tool_use', tool_name: 'Write' }),
        JSON.stringify({ type: 'result', result: 'Done', session_id: 'sess-1' }),
      ].join('\n')

      const mockProc = {
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(mockStdout))
            controller.close()
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close()
          },
        }),
        exited: Promise.resolve(0),
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as ReturnType<typeof Bun.spawn>)

      try {
        const result = await service.executeCLI({ prompt: 'Do something' })

        expect(result.toolsUsed).toContain('Read')
        expect(result.toolsUsed).toContain('Write')
      } finally {
        Bun.spawn = originalSpawn
      }
    })

    test('handles text format fallback', async () => {
      const mockStdout = 'Plain text response without JSON'

      const mockProc = {
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(mockStdout))
            controller.close()
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close()
          },
        }),
        exited: Promise.resolve(0),
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as ReturnType<typeof Bun.spawn>)

      try {
        const result = await service.executeCLI({
          prompt: 'Test',
          outputFormat: 'text',
        })

        expect(result.response).toBe('Plain text response without JSON')
        expect(result.mode).toBe('cli')
      } finally {
        Bun.spawn = originalSpawn
      }
    })

    test('extracts cost and duration from output', async () => {
      const mockStdout = JSON.stringify({
        type: 'result',
        result: 'Done',
        session_id: 'sess-1',
        cost_usd: 0.015,
        duration_ms: 1500,
      })

      const mockProc = {
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(mockStdout))
            controller.close()
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close()
          },
        }),
        exited: Promise.resolve(0),
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as ReturnType<typeof Bun.spawn>)

      try {
        const result = await service.executeCLI({ prompt: 'Test' })

        expect(result.costUsd).toBe(0.015)
        expect(result.durationMs).toBe(1500)
      } finally {
        Bun.spawn = originalSpawn
      }
    })
  })

  describe('streamCLI()', () => {
    test('yields init chunk on system init event', async () => {
      const events =
        [
          JSON.stringify({
            type: 'system',
            subtype: 'init',
            session_id: 'stream-sess',
            cwd: '/test',
          }),
          JSON.stringify({ type: 'result', result: 'Done' }),
        ].join('\n') + '\n'

      const mockProc = {
        pid: 12345,
        stdout: {
          getReader: () => {
            let sent = false
            return {
              read: async () => {
                if (!sent) {
                  sent = true
                  return { done: false, value: new TextEncoder().encode(events) }
                }
                return { done: true, value: undefined }
              },
            }
          },
        },
        stderr: new ReadableStream({
          start(c) {
            c.close()
          },
        }),
        stdin: null,
        exitCode: 0,
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as unknown as ReturnType<typeof Bun.spawn>)

      try {
        const chunks: StreamChunk[] = []
        for await (const chunk of service.streamCLI({ prompt: 'Test' })) {
          chunks.push(chunk)
        }

        const initChunk = chunks.find((c) => c.type === 'init')
        expect(initChunk).toBeDefined()
        expect(initChunk?.sessionId).toBe('stream-sess')
      } finally {
        Bun.spawn = originalSpawn
      }
    })

    test('yields text chunks from assistant messages', async () => {
      const events =
        [
          JSON.stringify({
            type: 'assistant',
            session_id: 'sess-1',
            message: { content: [{ type: 'text', text: 'Hello from assistant' }] },
          }),
          JSON.stringify({ type: 'result', result: 'Done' }),
        ].join('\n') + '\n'

      const mockProc = {
        pid: 12345,
        stdout: {
          getReader: () => {
            let sent = false
            return {
              read: async () => {
                if (!sent) {
                  sent = true
                  return { done: false, value: new TextEncoder().encode(events) }
                }
                return { done: true, value: undefined }
              },
            }
          },
        },
        stderr: new ReadableStream({
          start(c) {
            c.close()
          },
        }),
        stdin: null,
        exitCode: 0,
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as unknown as ReturnType<typeof Bun.spawn>)

      try {
        const chunks: StreamChunk[] = []
        for await (const chunk of service.streamCLI({ prompt: 'Test' })) {
          chunks.push(chunk)
        }

        const textChunk = chunks.find((c) => c.type === 'text')
        expect(textChunk).toBeDefined()
        expect(textChunk?.data).toBe('Hello from assistant')
      } finally {
        Bun.spawn = originalSpawn
      }
    })

    test('yields tool_use chunks', async () => {
      const events =
        [
          JSON.stringify({
            type: 'assistant',
            session_id: 'sess-1',
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'Read',
                  input: { file_path: '/test.txt' },
                },
              ],
            },
          }),
          JSON.stringify({ type: 'result', result: 'Done' }),
        ].join('\n') + '\n'

      const mockProc = {
        pid: 12345,
        stdout: {
          getReader: () => {
            let sent = false
            return {
              read: async () => {
                if (!sent) {
                  sent = true
                  return { done: false, value: new TextEncoder().encode(events) }
                }
                return { done: true, value: undefined }
              },
            }
          },
        },
        stderr: new ReadableStream({
          start(c) {
            c.close()
          },
        }),
        stdin: null,
        exitCode: 0,
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as unknown as ReturnType<typeof Bun.spawn>)

      try {
        const chunks: StreamChunk[] = []
        for await (const chunk of service.streamCLI({ prompt: 'Test' })) {
          chunks.push(chunk)
        }

        const toolChunk = chunks.find((c) => c.type === 'tool_use')
        expect(toolChunk).toBeDefined()
        expect(toolChunk?.tool).toBe('Read')
        expect(toolChunk?.toolInput).toEqual({ file_path: '/test.txt' })
      } finally {
        Bun.spawn = originalSpawn
      }
    })

    test('yields done chunk at the end', async () => {
      const events = JSON.stringify({ type: 'result', result: 'Done' }) + '\n'

      const mockProc = {
        pid: 12345,
        stdout: {
          getReader: () => {
            let sent = false
            return {
              read: async () => {
                if (!sent) {
                  sent = true
                  return { done: false, value: new TextEncoder().encode(events) }
                }
                return { done: true, value: undefined }
              },
            }
          },
        },
        stderr: new ReadableStream({
          start(c) {
            c.close()
          },
        }),
        stdin: null,
        exitCode: 0,
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as unknown as ReturnType<typeof Bun.spawn>)

      try {
        const chunks: StreamChunk[] = []
        for await (const chunk of service.streamCLI({ prompt: 'Test' })) {
          chunks.push(chunk)
        }

        const lastChunk = chunks[chunks.length - 1]
        expect(lastChunk.type).toBe('done')
      } finally {
        Bun.spawn = originalSpawn
      }
    })
  })

  describe('execute() SDK', () => {
    test.skip('returns execute result with response - requires SDK mock', async () => {
      // SDK module is readonly and cannot be mocked directly in Bun
      // This test would require dependency injection or a wrapper module
      // For now, SDK functionality is tested via integration tests
      expect(true).toBe(true)
    })

    test('ClaudeService instance can be created', () => {
      const instance = new ClaudeService()
      expect(instance).toBeDefined()
      expect(typeof instance.execute).toBe('function')
      expect(typeof instance.executeCLI).toBe('function')
      expect(typeof instance.stream).toBe('function')
      expect(typeof instance.streamCLI).toBe('function')
    })
  })
})

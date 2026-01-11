import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { CodexService } from './codex'
import type { StreamChunk } from '../../../shared/types'

describe('CodexService', () => {
  let service: CodexService

  beforeEach(() => {
    service = new CodexService()
  })

  describe('constructor', () => {
    test('initializes without throwing', () => {
      expect(() => new CodexService()).not.toThrow()
    })
  })

  describe('executeCLI()', () => {
    test('spawns codex with correct arguments', async () => {
      const mockStdout = JSON.stringify({
        type: 'message.delta',
        delta: 'Hello from Codex'
      }) + '\n' + JSON.stringify({
        type: 'response.done',
        session_id: 'codex-session-123'
      })

      const mockProc = {
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(mockStdout))
            controller.close()
          }
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close()
          }
        }),
        exited: Promise.resolve(0),
        pid: 12345,
        kill: mock(() => {})
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as unknown as ReturnType<typeof Bun.spawn>)

      try {
        const result = await service.executeCLI({
          prompt: 'Hello',
          workDir: '/test/dir'
        })

        expect(Bun.spawn).toHaveBeenCalled()
        const callArgs = (Bun.spawn as ReturnType<typeof mock>).mock.calls[0][0]
        expect(callArgs).toContain('codex')
        expect(result.mode).toBe('cli')
      } finally {
        Bun.spawn = originalSpawn
      }
    })
  })

  describe('streamCLI()', () => {
    test('yields chunks from codex output', async () => {
      const events = [
        { type: 'message.delta', delta: 'Hello ' },
        { type: 'message.delta', delta: 'World' },
        { type: 'response.done', session_id: 'test-session' }
      ]

      const mockStdout = events.map(e => JSON.stringify(e)).join('\n')

      const mockProc = {
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(mockStdout))
            controller.close()
          }
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close()
          }
        }),
        exited: Promise.resolve(0),
        pid: 12345,
        kill: mock(() => {})
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as unknown as ReturnType<typeof Bun.spawn>)

      try {
        const chunks: StreamChunk[] = []
        for await (const chunk of service.streamCLI({ prompt: 'test' })) {
          chunks.push(chunk)
        }

        expect(chunks.length).toBeGreaterThan(0)
      } finally {
        Bun.spawn = originalSpawn
      }
    })
  })

  describe('streamCLIWithAbort()', () => {
    test('returns stream and abort function', () => {
      const mockProc = {
        stdout: new ReadableStream({
          start(controller) {
            controller.close()
          }
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close()
          }
        }),
        exited: Promise.resolve(0),
        pid: 12345,
        kill: mock(() => {})
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as unknown as ReturnType<typeof Bun.spawn>)

      try {
        const { stream, abort } = service.streamCLIWithAbort({ prompt: 'test' })

        expect(stream).toBeDefined()
        expect(typeof abort).toBe('function')
      } finally {
        Bun.spawn = originalSpawn
      }
    })

    test('abort kills the process', async () => {
      const killMock = mock(() => {})
      const mockProc = {
        stdout: new ReadableStream({
          start(_controller) {
            // Never close to simulate long-running process
          }
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close()
          }
        }),
        exited: new Promise(() => {}), // Never resolves
        pid: 12345,
        kill: killMock
      }

      const originalSpawn = Bun.spawn
      Bun.spawn = mock(() => mockProc as unknown as ReturnType<typeof Bun.spawn>)

      try {
        const { abort } = service.streamCLIWithAbort({ prompt: 'test' })
        abort()

        expect(killMock).toHaveBeenCalled()
      } finally {
        Bun.spawn = originalSpawn
      }
    })
  })
})

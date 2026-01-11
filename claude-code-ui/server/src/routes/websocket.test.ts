import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test'
import { Elysia } from 'elysia'
import { createWebSocketRoutes } from './websocket'
import type { ClaudeService } from '../services/claude'
import type { CodexService } from '../services/codex'
import type { GeminiService } from '../services/gemini'
import type { SessionStore } from '../services/sessions'

interface MockStreamChunk {
  type: string
  data: string
  sessionId?: string
  tool?: string
  toolInput?: Record<string, unknown>
}

function createMockClaudeService(): ClaudeService {
  return {
    execute: mock(() => Promise.resolve({ response: '', messages: [], sessionId: '', toolsUsed: [], mode: 'sdk' as const })),
    executeCLI: mock(() => Promise.resolve({ response: '', sessionId: '', toolsUsed: [], mode: 'cli' as const })),
    stream: mock(() => (async function* () { yield { type: 'done', data: '' } })()),
    streamCLI: mock(() => (async function* () { yield { type: 'done', data: '' } })()),
    streamCLIWithAbort: mock(() => ({
      stream: (async function* (): AsyncGenerator<MockStreamChunk> {
        yield { type: 'text', data: 'Hello' }
        yield { type: 'done', data: '' }
      })(),
      abort: mock(() => {}),
      sendUserAnswer: mock(() => {})
    }))
  } as unknown as ClaudeService
}

function createMockCodexService(): CodexService {
  return {
    streamCLIWithAbort: mock(() => ({
      stream: (async function* (): AsyncGenerator<MockStreamChunk> {
        yield { type: 'done', data: '' }
      })(),
      abort: mock(() => {}),
      sendUserAnswer: mock(() => {})
    }))
  } as unknown as CodexService
}

function createMockGeminiService(): GeminiService {
  return {
    streamCLIWithAbort: mock(() => ({
      stream: (async function* (): AsyncGenerator<MockStreamChunk> {
        yield { type: 'done', data: '' }
      })(),
      abort: mock(() => {}),
      sendUserAnswer: mock(() => {})
    }))
  } as unknown as GeminiService
}

function createMockSessionStore(): SessionStore {
  return {
    get: mock(() => Promise.resolve({ id: 'test-session', messages: [], name: '', createdAt: '', updatedAt: '', workDir: '' })),
    addMessage: mock(() => Promise.resolve()),
    addAgent: mock(() => Promise.resolve()),
    create: mock(() => Promise.resolve({ id: 'new-session', messages: [], name: '', createdAt: '', updatedAt: '', workDir: '' })),
    list: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
    delete: mock(() => Promise.resolve()),
    deleteAll: mock(() => Promise.resolve(0)),
    getSessionFilePath: mock((id: string) => `/mock/path/sessions/${id}.json`),
  } as unknown as SessionStore
}

function createMockOrchestrator() {
  return {
    enrichPrompt: mock(() => Promise.resolve({
      systemContext: '',
      enhancedPrompt: 'test prompt',
      metadata: {
        intent: { primary: 'code', confidence: 0.9, workflow: [] },
        injectedRules: [],
        injectedSkills: [],
        promptEngineerActive: false
      }
    })),
    formatEnrichedPrompt: mock((enriched: { enhancedPrompt: string }) => enriched.enhancedPrompt)
  }
}

function createMockAgentRegistry() {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>()
  return {
    on: mock((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
    }),
    off: mock((event: string, handler: (...args: unknown[]) => void) => {
      handlers.get(event)?.delete(handler)
    }),
    emit: (event: string, ...args: unknown[]) => {
      handlers.get(event)?.forEach(h => h(...args))
    }
  }
}

// Helper para crear app de test con WebSocket routes
function createWsTestApp(
  claude: ClaudeService,
  codex: CodexService,
  gemini: GeminiService,
  sessions: SessionStore,
  orchestrator: ReturnType<typeof createMockOrchestrator>,
  agentRegistry: ReturnType<typeof createMockAgentRegistry>
) {
  return new Elysia()
    .use(createWebSocketRoutes(
      claude,
      codex,
      gemini,
      sessions,
      orchestrator as unknown as typeof import('../services/orchestrator').orchestrator,
      agentRegistry as unknown as typeof import('../services/agent-registry').agentRegistry
    ))
}

type WsTestApp = ReturnType<typeof createWsTestApp>

describe('WebSocket Routes', () => {
  let app: WsTestApp
  let mockClaude: ClaudeService
  let mockCodex: CodexService
  let mockGemini: GeminiService
  let mockSessions: SessionStore
  let mockOrchestrator: ReturnType<typeof createMockOrchestrator>
  let mockAgentRegistry: ReturnType<typeof createMockAgentRegistry>
  let server: ReturnType<WsTestApp['listen']> | null = null
  let baseUrl: string

  beforeEach(() => {
    mockClaude = createMockClaudeService()
    mockCodex = createMockCodexService()
    mockGemini = createMockGeminiService()
    mockSessions = createMockSessionStore()
    mockOrchestrator = createMockOrchestrator()
    mockAgentRegistry = createMockAgentRegistry()

    app = createWsTestApp(
      mockClaude,
      mockCodex,
      mockGemini,
      mockSessions,
      mockOrchestrator,
      mockAgentRegistry
    )

    server = app.listen({ port: 0 })
    baseUrl = `ws://localhost:${server.server?.port}`
  })

  afterEach(() => {
    server?.stop()
    server = null
  })

  describe('Connection lifecycle', () => {
    test('accepts WebSocket connection', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      const connected = await new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000)
        ws.onopen = () => {
          clearTimeout(timeout)
          resolve(true)
        }
        ws.onerror = (e) => {
          clearTimeout(timeout)
          reject(e)
        }
      })

      expect(connected).toBe(true)
      ws.close()
    })

    test('handles clean disconnect', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve()
      })

      const closedCleanly = await new Promise<boolean>((resolve) => {
        ws.onclose = (e) => resolve(e.wasClean)
        ws.close()
      })

      expect(closedCleanly).toBe(true)
    })
  })

  describe('Message handling - abort', () => {
    test('handles abort message when no active process', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve()
      })

      const messages: unknown[] = []
      ws.onmessage = (e) => {
        messages.push(JSON.parse(e.data))
      }

      ws.send(JSON.stringify({ type: 'abort', data: {} }))

      await Bun.sleep(100)

      const resultMsg = messages.find((m: unknown) =>
        (m as { type: string }).type === 'result' &&
        (m as { data: string }).data.includes('No active process')
      )
      expect(resultMsg).toBeDefined()

      ws.close()
    })
  })

  describe('Message handling - execute-cli', () => {
    test('sends request_id after execute-cli', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve()
      })

      const messages: unknown[] = []
      ws.onmessage = (e) => {
        messages.push(JSON.parse(e.data))
      }

      ws.send(JSON.stringify({
        type: 'execute-cli',
        data: {
          prompt: 'Hello',
          sessionId: 'test-session'
        }
      }))

      await Bun.sleep(200)

      const requestIdMsg = messages.find((m: unknown) => (m as { type: string }).type === 'request_id')
      expect(requestIdMsg).toBeDefined()
      expect((requestIdMsg as { data: string }).data).toBeTruthy()

      ws.close()
    })

    test('streams text chunks from claude service', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve()
      })

      const messages: unknown[] = []
      ws.onmessage = (e) => {
        messages.push(JSON.parse(e.data))
      }

      ws.send(JSON.stringify({
        type: 'execute-cli',
        data: {
          prompt: 'Test prompt',
          sessionId: 'test-session'
        }
      }))

      await Bun.sleep(200)

      const textMsg = messages.find((m: unknown) => (m as { type: string }).type === 'text')
      expect(textMsg).toBeDefined()
      expect((textMsg as { data: string }).data).toBe('Hello')

      const doneMsg = messages.find((m: unknown) => (m as { type: string }).type === 'done')
      expect(doneMsg).toBeDefined()

      ws.close()
    })

    test('calls sessionStore.addMessage for user prompt', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve()
      })

      ws.send(JSON.stringify({
        type: 'execute-cli',
        data: {
          prompt: 'Test prompt',
          sessionId: 'test-session'
        }
      }))

      await Bun.sleep(200)

      expect(mockSessions.addMessage).toHaveBeenCalled()

      ws.close()
    })

    test('uses codex service when provider is codex', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve()
      })

      ws.send(JSON.stringify({
        type: 'execute-cli',
        data: {
          prompt: 'Test',
          provider: 'codex'
        }
      }))

      await Bun.sleep(200)

      expect(mockCodex.streamCLIWithAbort).toHaveBeenCalled()

      ws.close()
    })

    test('uses gemini service when provider is gemini', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve()
      })

      ws.send(JSON.stringify({
        type: 'execute-cli',
        data: {
          prompt: 'Test',
          provider: 'gemini'
        }
      }))

      await Bun.sleep(200)

      expect(mockGemini.streamCLIWithAbort).toHaveBeenCalled()

      ws.close()
    })
  })

  describe('Message handling - user_answer', () => {
    test('handles user_answer message', async () => {
      let capturedSendUserAnswer: ReturnType<typeof mock> | null = null

      const customMockClaude = {
        ...mockClaude,
        streamCLIWithAbort: mock(() => {
          const sendUserAnswer = mock(() => {})
          capturedSendUserAnswer = sendUserAnswer
          return {
            stream: (async function* (): AsyncGenerator<MockStreamChunk> {
              await Bun.sleep(500)
              yield { type: 'done', data: '' }
            })(),
            abort: mock(() => {}),
            sendUserAnswer
          }
        })
      } as unknown as ClaudeService

      const customApp = new Elysia()
        .use(createWebSocketRoutes(
          customMockClaude,
          mockCodex,
          mockGemini,
          mockSessions,
          mockOrchestrator as unknown as typeof import('../services/orchestrator').orchestrator,
          mockAgentRegistry as unknown as typeof import('../services/agent-registry').agentRegistry
        ))

      const customServer = customApp.listen({ port: 0 })
      const customBaseUrl = `ws://localhost:${customServer.server?.port}`

      try {
        const ws = new WebSocket(`${customBaseUrl}/ws`)

        await new Promise<void>((resolve) => {
          ws.onopen = () => resolve()
        })

        let requestId: string | null = null
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          if (msg.type === 'request_id') {
            requestId = msg.data
          }
        }

        ws.send(JSON.stringify({
          type: 'execute-cli',
          data: { prompt: 'Test' }
        }))

        await Bun.sleep(100)
        expect(requestId).toBeTruthy()

        ws.send(JSON.stringify({
          type: 'user_answer',
          data: { requestId, answer: 'yes' }
        }))

        await Bun.sleep(100)

        expect(capturedSendUserAnswer).toHaveBeenCalledWith('yes')

        ws.close()
      } finally {
        customServer.stop()
      }
    })
  })

  describe('Orchestration mode', () => {
    test('enriches prompt when orchestrate is true', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve()
      })

      const messages: unknown[] = []
      ws.onmessage = (e) => {
        messages.push(JSON.parse(e.data))
      }

      ws.send(JSON.stringify({
        type: 'execute-cli',
        data: {
          prompt: 'Test',
          orchestrate: true
        }
      }))

      await Bun.sleep(200)

      expect(mockOrchestrator.enrichPrompt).toHaveBeenCalled()
      expect(mockOrchestrator.formatEnrichedPrompt).toHaveBeenCalled()

      const contextMsg = messages.find((m: unknown) =>
        (m as { type: string }).type === 'context' &&
        (m as { contextType: string }).contextType === 'rule'
      )
      expect(contextMsg).toBeDefined()

      ws.close()
    })
  })

  describe('Agent events', () => {
    test('registers agent event listeners on execute-cli', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve()
      })

      ws.send(JSON.stringify({
        type: 'execute-cli',
        data: { prompt: 'Test' }
      }))

      await Bun.sleep(200)

      expect(mockAgentRegistry.on).toHaveBeenCalledWith('agent:created', expect.any(Function))
      expect(mockAgentRegistry.on).toHaveBeenCalledWith('agent:started', expect.any(Function))
      expect(mockAgentRegistry.on).toHaveBeenCalledWith('agent:completed', expect.any(Function))
      expect(mockAgentRegistry.on).toHaveBeenCalledWith('agent:failed', expect.any(Function))

      ws.close()
    })

    test('removes agent event listeners after completion', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve()
      })

      ws.send(JSON.stringify({
        type: 'execute-cli',
        data: { prompt: 'Test' }
      }))

      await Bun.sleep(300)

      expect(mockAgentRegistry.off).toHaveBeenCalledWith('agent:created', expect.any(Function))
      expect(mockAgentRegistry.off).toHaveBeenCalledWith('agent:started', expect.any(Function))
      expect(mockAgentRegistry.off).toHaveBeenCalledWith('agent:completed', expect.any(Function))
      expect(mockAgentRegistry.off).toHaveBeenCalledWith('agent:failed', expect.any(Function))

      ws.close()
    })
  })

  describe('Error handling', () => {
    test('sends error message on exception', async () => {
      const errorMockClaude = {
        ...mockClaude,
        streamCLIWithAbort: mock(() => {
          throw new Error('Test error')
        })
      } as unknown as ClaudeService

      const errorApp = new Elysia()
        .use(createWebSocketRoutes(
          errorMockClaude,
          mockCodex,
          mockGemini,
          mockSessions,
          mockOrchestrator as unknown as typeof import('../services/orchestrator').orchestrator,
          mockAgentRegistry as unknown as typeof import('../services/agent-registry').agentRegistry
        ))

      const errorServer = errorApp.listen({ port: 0 })
      const errorBaseUrl = `ws://localhost:${errorServer.server?.port}`

      try {
        const ws = new WebSocket(`${errorBaseUrl}/ws`)

        await new Promise<void>((resolve) => {
          ws.onopen = () => resolve()
        })

        const messages: unknown[] = []
        ws.onmessage = (e) => {
          messages.push(JSON.parse(e.data))
        }

        ws.send(JSON.stringify({
          type: 'execute-cli',
          data: { prompt: 'Test' }
        }))

        await Bun.sleep(200)

        const errorMsg = messages.find((m: unknown) => (m as { type: string }).type === 'error')
        expect(errorMsg).toBeDefined()
        expect((errorMsg as { data: string }).data).toBe('Test error')

        ws.close()
      } finally {
        errorServer.stop()
      }
    })
  })

  describe('Abort during execution', () => {
    test('aborts active process and sends confirmation', async () => {
      let abortCalled = false
      const longRunningMockClaude = {
        ...mockClaude,
        streamCLIWithAbort: mock(() => ({
          stream: (async function* (): AsyncGenerator<MockStreamChunk> {
            await Bun.sleep(1000)
            yield { type: 'done', data: '' }
          })(),
          abort: mock(() => { abortCalled = true }),
          sendUserAnswer: mock(() => {})
        }))
      } as unknown as ClaudeService

      const abortApp = new Elysia()
        .use(createWebSocketRoutes(
          longRunningMockClaude,
          mockCodex,
          mockGemini,
          mockSessions,
          mockOrchestrator as unknown as typeof import('../services/orchestrator').orchestrator,
          mockAgentRegistry as unknown as typeof import('../services/agent-registry').agentRegistry
        ))

      const abortServer = abortApp.listen({ port: 0 })
      const abortBaseUrl = `ws://localhost:${abortServer.server?.port}`

      try {
        const ws = new WebSocket(`${abortBaseUrl}/ws`)

        await new Promise<void>((resolve) => {
          ws.onopen = () => resolve()
        })

        let requestId: string | null = null
        const messages: unknown[] = []
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          messages.push(msg)
          if (msg.type === 'request_id') {
            requestId = msg.data
          }
        }

        ws.send(JSON.stringify({
          type: 'execute-cli',
          data: { prompt: 'Long running task' }
        }))

        await Bun.sleep(100)
        expect(requestId).toBeTruthy()

        ws.send(JSON.stringify({
          type: 'abort',
          data: { requestId }
        }))

        await Bun.sleep(200)

        expect(abortCalled).toBe(true)

        const abortedMsg = messages.find((m: unknown) =>
          (m as { type: string }).type === 'result' &&
          (m as { aborted?: boolean }).aborted === true
        )
        expect(abortedMsg).toBeDefined()

        ws.close()
      } finally {
        abortServer.stop()
      }
    })
  })
})

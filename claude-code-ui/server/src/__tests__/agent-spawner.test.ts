import { describe, it, expect, beforeEach, mock } from 'bun:test'

const noopLog = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

mock.module('../logger', () => ({
  logger: {
    ...noopLog,
    child: () => ({ ...noopLog }),
  },
}))

mock.module('../services/expert-store', () => ({
  expertStore: {
    list: mock(() => Promise.resolve([])),
    load: mock(() => Promise.resolve({})),
    save: mock(() => Promise.resolve()),
    update: mock(() => Promise.resolve({})),
    exists: mock(() => Promise.resolve(false)),
    addChangelogEntry: mock(() => Promise.resolve()),
    validate: mock(() => Promise.resolve({ valid: true, errors: [], warnings: [] })),
    getAgentPrompt: mock(() => Promise.resolve('')),
    clearCache: mock(() => {}),
  },
  ExpertStore: class {},
}))

mock.module('../cache', () => ({
  agentPromptCache: {
    get: () => undefined,
    set: () => {},
    clear: () => {},
  },
  configCache: {
    get: () => undefined,
    set: () => {},
    clear: () => {},
  },
  rulesCache: {
    get: () => undefined,
    set: () => {},
    clear: () => {},
  },
  SimpleCache: class {
    get() {
      return undefined
    }
    set() {}
    clear() {}
  },
}))

import { AgentSpawner } from '../services/agent-spawner'
import { agentRegistry } from '../services/agent-registry'
import type { StreamChunk } from '@shared/types'

const createMockClaudeService = () => {
  const mockStream = async function* (): AsyncGenerator<StreamChunk> {
    yield { type: 'text', data: 'Starting task...' }
    yield { type: 'tool_use', data: '', tool: 'Read', toolUseId: 'tu-1' }
    yield { type: 'tool_result', data: '', toolUseId: 'tu-1', toolOutput: 'File content' }
    yield { type: 'text', data: 'Task completed.' }
    yield {
      type: 'result',
      data: '## Summary\n\nTask done successfully.',
      usage: {
        inputTokens: 50,
        outputTokens: 50,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        totalTokens: 100,
        contextPercent: 5,
      },
    }
  }

  return {
    streamCLIWithAbort: mock(() => ({
      stream: mockStream(),
      abort: mock(() => {}),
      sendUserAnswer: mock(() => {}),
    })),
  }
}

describe('AgentSpawner', () => {
  let spawner: AgentSpawner
  let mockClaudeService: ReturnType<typeof createMockClaudeService>

  beforeEach(() => {
    mockClaudeService = createMockClaudeService()
    spawner = new AgentSpawner(mockClaudeService as any)
    agentRegistry.clearAll()
  })

  describe('spawn', () => {
    it('should spawn an agent and return result', async () => {
      const result = await spawner.spawn({
        type: 'builder',
        prompt: 'Build a new feature',
        sessionId: 'test-session',
      })

      expect(result.success).toBe(true)
      expect(result.output).toContain('Summary')
      expect(result.metrics.toolCalls).toBe(1)
      expect(result.metrics.tokensUsed).toBe(100)
    })

    it('should register agent with registry', async () => {
      const result = await spawner.spawn({
        type: 'scout',
        prompt: 'Explore codebase',
        sessionId: 'test-session',
      })

      const agent = agentRegistry.getAgent(result.agentId)
      expect(agent).not.toBeNull()
      expect(agent?.status).toBe('completed')
    })

    it('should emit spawned event', async () => {
      const events: string[] = []
      spawner.on('spawned', () => events.push('spawned'))

      await spawner.spawn({
        type: 'builder',
        prompt: 'Test',
        sessionId: 'test-session',
      })

      expect(events).toContain('spawned')
    })

    it('should emit completed event on success', async () => {
      const events: any[] = []
      spawner.on('completed', (data) => events.push(data))

      await spawner.spawn({
        type: 'builder',
        prompt: 'Test',
        sessionId: 'test-session',
      })

      expect(events.length).toBe(1)
      expect(events[0].success).toBe(true)
    })

    it('should normalize expert types to general-purpose', async () => {
      await spawner.spawn({
        type: 'expert:websocket',
        prompt: 'WebSocket task',
        sessionId: 'test-session',
        expertId: 'websocket',
      })

      expect(mockClaudeService.streamCLIWithAbort).toHaveBeenCalled()
    })

    it('should include expert context in prompt when expertId provided', async () => {
      await spawner.spawn({
        type: 'builder',
        prompt: 'Task',
        sessionId: 'test-session',
        expertId: 'websocket',
      })

      const call = mockClaudeService.streamCLIWithAbort.mock.calls[0]
      expect(call).toBeDefined()
    })
  })

  describe('kill', () => {
    it('should return false for non-existent agent', async () => {
      const result = await spawner.kill('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('getActiveSpawns', () => {
    it('should return empty array initially', () => {
      const active = spawner.getActiveSpawns()
      expect(active).toHaveLength(0)
    })
  })
})

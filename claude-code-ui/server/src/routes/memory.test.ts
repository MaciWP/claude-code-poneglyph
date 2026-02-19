import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { Elysia } from 'elysia'

// Mock logger
const mockLogger = {
  debug: mock(() => {}),
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
}

mock.module('../logger', () => ({
  logger: {
    child: () => mockLogger,
    debug: mockLogger.debug,
    info: mockLogger.info,
    warn: mockLogger.warn,
    error: mockLogger.error,
  },
}))

// Mock memory services
const mockMemoryStore = {
  getAll: mock(() => Promise.resolve([] as Record<string, unknown>[])),
  add: mock(() => Promise.resolve({ id: 'mem-1' })),
  getStats: mock(() => ({ totalMemories: 0, byType: {} })),
}

const mockInitMemorySystem = mock(() => Promise.resolve())
const mockSearchRelevantMemories = mock(() => Promise.resolve([] as Record<string, unknown>[]))
const mockGetMemorySystemStats = mock(() => ({
  initialized: true,
  config: { enableEmbeddings: true },
  storeStats: { totalMemories: 0 },
  graphStats: { nodes: 0, edges: 0 },
}))
const mockProcessFeedback = mock(() => Promise.resolve())

mock.module('../services/memory', () => ({
  initMemorySystem: mockInitMemorySystem,
  searchRelevantMemories: mockSearchRelevantMemories,
  getMemorySystemStats: mockGetMemorySystemStats,
  processFeedback: mockProcessFeedback,
  memoryStore: mockMemoryStore,
  extractMemoriesFromConversation: mock(() => Promise.resolve([])),
  generateEmbedding: mock(() => Promise.resolve([])),
  semanticSearch: mock(() => Promise.resolve([])),
  cosineSimilarity: mock(() => 0),
  preloadModel: mock(() => Promise.resolve()),
  isModelLoaded: mock(() => false),
  memoryGraph: { init: mock(() => Promise.resolve()), getStats: () => ({}) },
  extractFromConversation: mock(() => Promise.resolve([])),
  extractFromText: mock(() => Promise.resolve([])),
  extractTags: mock(() => []),
  extractExplicitMemory: mock(() => null),
  runAbstraction: mock(() => Promise.resolve()),
  findSimilarMemories: mock(() => Promise.resolve([])),
  abstractCluster: mock(() => Promise.resolve()),
  detectPatterns: mock(() => Promise.resolve([])),
  checkForTriggers: mock(() => Promise.resolve([])),
  handleActiveLearningResponse: mock(() => Promise.resolve()),
  resetSessionState: mock(() => {}),
  getSessionStats: mock(() => ({})),
}))

// Mock memory injection
const mockInjectMemories = mock(() =>
  Promise.resolve({ memories: [] as Record<string, unknown>[], totalTokens: 0 })
)
const mockRecordFeedback = mock(() => {})
const mockWarmUp = mock(() => Promise.resolve())

mock.module('../services/memory/injection', () => ({
  injectMemories: mockInjectMemories,
  recordFeedback: mockRecordFeedback,
  warmUp: mockWarmUp,
}))

// Mock memory catcher
const mockMemoryCatcher = {
  start: mock(() => {}),
  stop: mock(() => {}),
  isRunning: mock(() => false),
  getStats: mock(() => ({
    sessionsProcessed: 0,
    memoriesExtracted: 0,
    memoriesDeduplicated: 0,
    lastRun: null as string | null,
    errors: 0,
  })),
  catchMemories: mock(() => Promise.resolve()),
}

mock.module('../services/memory/catcher', () => ({
  memoryCatcher: mockMemoryCatcher,
}))

// Import after mocking (dynamic import to avoid hoisting above mock.module)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { memoryRoutes } = require('./memory')

function createTestApp() {
  return new Elysia().use(memoryRoutes)
}

describe('Memory Routes', () => {
  let app: ReturnType<typeof createTestApp>
  let server: ReturnType<typeof app.listen> | null = null
  let baseUrl: string

  beforeEach(() => {
    // Reset all mocks
    mockInitMemorySystem.mockClear()
    mockSearchRelevantMemories.mockClear()
    mockGetMemorySystemStats.mockClear()
    mockProcessFeedback.mockClear()
    mockMemoryStore.getAll.mockClear()
    mockInjectMemories.mockClear()
    mockRecordFeedback.mockClear()
    mockWarmUp.mockClear()
    mockMemoryCatcher.start.mockClear()
    mockMemoryCatcher.stop.mockClear()
    mockMemoryCatcher.isRunning.mockClear()
    mockMemoryCatcher.getStats.mockClear()
    mockMemoryCatcher.catchMemories.mockClear()
    mockLogger.error.mockClear()

    app = createTestApp()
    server = app.listen({ port: 0 })
    baseUrl = `http://localhost:${server.server?.port}`
  })

  afterEach(() => {
    server?.stop()
    server = null
  })

  describe('GET /api/memory', () => {
    test('should return all memories', async () => {
      const mockMemories = [
        { id: 'mem-1', content: 'Test memory 1', type: 'semantic' },
        { id: 'mem-2', content: 'Test memory 2', type: 'episodic' },
      ]
      mockMemoryStore.getAll.mockResolvedValueOnce(mockMemories)

      const response = await fetch(`${baseUrl}/api/memory`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.memories).toEqual(mockMemories)
      expect(data.count).toBe(2)
      expect(mockInitMemorySystem).toHaveBeenCalled()
    })

    test('should handle errors gracefully', async () => {
      mockMemoryStore.getAll.mockRejectedValueOnce(new Error('Database error'))

      const response = await fetch(`${baseUrl}/api/memory`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Failed to get memories')
      expect(data.details).toBe('Database error')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('POST /api/memory/search', () => {
    test('should return search results', async () => {
      const mockResults = [{ memory: { id: 'mem-1', content: 'Matching memory' }, similarity: 0.9 }]
      mockSearchRelevantMemories.mockResolvedValueOnce(mockResults)

      const response = await fetch(`${baseUrl}/api/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test query' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toEqual(mockResults)
      expect(mockSearchRelevantMemories).toHaveBeenCalledWith('test query', {
        limit: 5,
        useSemanticSearch: true,
      })
    })

    test('should respect custom limit', async () => {
      mockSearchRelevantMemories.mockResolvedValueOnce([])

      const response = await fetch(`${baseUrl}/api/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test', limit: 10 }),
      })

      expect(response.status).toBe(200)
      expect(mockSearchRelevantMemories).toHaveBeenCalledWith('test', {
        limit: 10,
        useSemanticSearch: true,
      })
    })

    test('should handle search errors gracefully', async () => {
      mockSearchRelevantMemories.mockRejectedValueOnce(new Error('Search failed'))

      const response = await fetch(`${baseUrl}/api/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Search failed')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('should reject invalid request body', async () => {
      const response = await fetch(`${baseUrl}/api/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(422)
    })
  })

  describe('GET /api/memory/stats', () => {
    test('should return memory statistics', async () => {
      const mockStats = {
        initialized: true,
        config: { enableEmbeddings: true },
        storeStats: { totalMemories: 42 },
        graphStats: { nodes: 10, edges: 5 },
      }
      mockGetMemorySystemStats.mockReturnValueOnce(mockStats)

      const response = await fetch(`${baseUrl}/api/memory/stats`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockStats)
      expect(mockInitMemorySystem).toHaveBeenCalled()
    })

    test('should handle stats errors gracefully', async () => {
      mockGetMemorySystemStats.mockImplementationOnce(() => {
        throw new Error('Stats error')
      })

      const response = await fetch(`${baseUrl}/api/memory/stats`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Failed to get stats')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('POST /api/memory/feedback', () => {
    test('should process positive feedback', async () => {
      const response = await fetch(`${baseUrl}/api/memory/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryId: 'mem-1',
          type: 'positive',
          context: 'Helpful memory',
          sessionId: 'session-1',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(mockProcessFeedback).toHaveBeenCalled()
    })

    test('should process negative feedback', async () => {
      const response = await fetch(`${baseUrl}/api/memory/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryId: 'mem-1',
          type: 'negative',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
    })

    test('should handle feedback errors gracefully', async () => {
      mockProcessFeedback.mockRejectedValueOnce(new Error('Feedback error'))

      const response = await fetch(`${baseUrl}/api/memory/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryId: 'mem-1',
          type: 'positive',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Feedback processing failed')
    })
  })

  describe('POST /api/memory/inject', () => {
    test('should inject memories for query', async () => {
      const mockResult = {
        memories: [{ id: 'mem-1', content: 'Relevant memory' }],
        totalTokens: 100,
      }
      mockInjectMemories.mockResolvedValueOnce(mockResult)

      const response = await fetch(`${baseUrl}/api/memory/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test query',
          sessionId: 'session-1',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResult)
      expect(mockInjectMemories).toHaveBeenCalled()
    })

    test('should pass optional parameters', async () => {
      mockInjectMemories.mockResolvedValueOnce({ memories: [], totalTokens: 0 })

      await fetch(`${baseUrl}/api/memory/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          maxMemories: 3,
          minSimilarity: 0.8,
          maxTokens: 500,
          timeout: 5000,
        }),
      })

      expect(mockInjectMemories).toHaveBeenCalledWith('test', undefined, {
        maxMemories: 3,
        minSimilarity: 0.8,
        maxTokens: 500,
        timeout: 5000,
      })
    })

    test('should handle injection errors gracefully', async () => {
      mockInjectMemories.mockRejectedValueOnce(new Error('Injection failed'))

      const response = await fetch(`${baseUrl}/api/memory/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Injection failed')
    })
  })

  describe('POST /api/memory/injection-feedback', () => {
    test('should record injection feedback', async () => {
      const response = await fetch(`${baseUrl}/api/memory/injection-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryId: 'mem-1',
          sessionId: 'session-1',
          queryContext: 'original query',
          isPositive: true,
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(mockRecordFeedback).toHaveBeenCalledWith('mem-1', 'session-1', 'original query', true)
    })

    test('should handle feedback recording errors', async () => {
      mockRecordFeedback.mockImplementationOnce(() => {
        throw new Error('Recording failed')
      })

      const response = await fetch(`${baseUrl}/api/memory/injection-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryId: 'mem-1',
          sessionId: 'session-1',
          queryContext: 'query',
          isPositive: false,
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Feedback recording failed')
    })
  })

  describe('POST /api/memory/warmup', () => {
    test('should warm up memory service', async () => {
      const response = await fetch(`${baseUrl}/api/memory/warmup`, {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.message).toContain('warmed up')
      expect(mockWarmUp).toHaveBeenCalled()
    })

    test('should handle warmup errors gracefully', async () => {
      mockWarmUp.mockRejectedValueOnce(new Error('Warmup failed'))

      const response = await fetch(`${baseUrl}/api/memory/warmup`, {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Warmup failed')
    })
  })

  describe('GET /api/memory/catcher/stats', () => {
    test('should return catcher statistics', async () => {
      const mockStats = {
        sessionsProcessed: 5,
        memoriesExtracted: 20,
        memoriesDeduplicated: 3,
        lastRun: new Date().toISOString(),
        errors: 0,
      }
      mockMemoryCatcher.getStats.mockReturnValueOnce(mockStats)

      const response = await fetch(`${baseUrl}/api/memory/catcher/stats`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockStats)
    })

    test('should handle catcher stats errors', async () => {
      mockMemoryCatcher.getStats.mockImplementationOnce(() => {
        throw new Error('Stats error')
      })

      const response = await fetch(`${baseUrl}/api/memory/catcher/stats`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Failed to get catcher stats')
    })
  })

  describe('POST /api/memory/catcher/start', () => {
    test('should start memory catcher', async () => {
      mockMemoryCatcher.isRunning.mockReturnValueOnce(false)

      const response = await fetch(`${baseUrl}/api/memory/catcher/start`, {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.message).toContain('started')
      expect(mockMemoryCatcher.start).toHaveBeenCalled()
    })

    test('should return error if already running', async () => {
      mockMemoryCatcher.isRunning.mockReturnValueOnce(true)

      const response = await fetch(`${baseUrl}/api/memory/catcher/start`, {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(false)
      expect(data.message).toContain('already running')
      expect(mockMemoryCatcher.start).not.toHaveBeenCalled()
    })

    test('should handle start errors gracefully', async () => {
      mockMemoryCatcher.isRunning.mockImplementationOnce(() => {
        throw new Error('Start failed')
      })

      const response = await fetch(`${baseUrl}/api/memory/catcher/start`, {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Failed to start catcher')
    })
  })

  describe('POST /api/memory/catcher/stop', () => {
    test('should stop memory catcher', async () => {
      const response = await fetch(`${baseUrl}/api/memory/catcher/stop`, {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.message).toContain('stopped')
      expect(mockMemoryCatcher.stop).toHaveBeenCalled()
    })

    test('should handle stop errors gracefully', async () => {
      mockMemoryCatcher.stop.mockImplementationOnce(() => {
        throw new Error('Stop failed')
      })

      const response = await fetch(`${baseUrl}/api/memory/catcher/stop`, {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Failed to stop catcher')
    })
  })

  describe('POST /api/memory/catcher/run', () => {
    test('should run memory catcher manually', async () => {
      const mockStats = {
        sessionsProcessed: 1,
        memoriesExtracted: 5,
        memoriesDeduplicated: 0,
        lastRun: null,
        errors: 0,
      }
      mockMemoryCatcher.getStats.mockReturnValueOnce(mockStats)

      const response = await fetch(`${baseUrl}/api/memory/catcher/run`, {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.stats).toEqual(mockStats)
      expect(mockMemoryCatcher.catchMemories).toHaveBeenCalled()
    })

    test('should handle run errors gracefully', async () => {
      mockMemoryCatcher.catchMemories.mockRejectedValueOnce(new Error('Run failed'))

      const response = await fetch(`${baseUrl}/api/memory/catcher/run`, {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Failed to run catcher')
    })
  })
})

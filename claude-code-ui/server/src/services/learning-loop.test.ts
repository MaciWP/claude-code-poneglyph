import { describe, it, expect, beforeEach, afterEach, afterAll, mock, spyOn } from 'bun:test'
import { memoryGraph } from './memory/graph'
import { memoryStore } from './memory/store'
import { expertStore } from './expert-store'

// Mock logger to suppress output. Keep mock.module here since no other test
// file imports the full logger module (they import src/services/logger.ts
// or src/logger.ts, not this relative path from services/).
mock.module('../logger', () => ({
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => ({
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    }),
  },
}))

// Use spyOn instead of mock.module for memory/graph, memory/store, and
// expert-store to avoid replacing the global module cache and breaking
// other test files (e.g. memory.test.ts) that need the real implementations.

const graphAddEdgeSpy = spyOn(memoryGraph, 'addEdge').mockImplementation(
  () => Promise.resolve() as any
)
const graphGetRelatedSpy = spyOn(memoryGraph, 'getRelated').mockImplementation(
  () => Promise.resolve([]) as any
)

const storeAddSpy = spyOn(memoryStore, 'add').mockImplementation(
  () => Promise.resolve({ id: 'mem-1' }) as any
)
const storeSearchSpy = spyOn(memoryStore, 'search').mockImplementation(
  () => Promise.resolve([]) as any
)

const expertListSpy = spyOn(expertStore, 'list').mockImplementation(
  () => Promise.resolve([]) as any
)
const expertLoadSpy = spyOn(expertStore, 'load').mockImplementation(
  () => Promise.resolve({}) as any
)
const expertSaveSpy = spyOn(expertStore, 'save').mockImplementation(() => Promise.resolve() as any)
const expertUpdateSpy = spyOn(expertStore, 'update').mockImplementation(
  () => Promise.resolve({}) as any
)
const expertExistsSpy = spyOn(expertStore, 'exists').mockImplementation(() =>
  Promise.resolve(false)
)
const expertAddChangelogSpy = spyOn(expertStore, 'addChangelogEntry').mockImplementation(
  () => Promise.resolve() as any
)
const expertValidateSpy = spyOn(expertStore, 'validate').mockImplementation(
  () => Promise.resolve({ valid: true, errors: [], warnings: [] }) as any
)
const expertGetAgentPromptSpy = spyOn(expertStore, 'getAgentPrompt').mockImplementation(() =>
  Promise.resolve('')
)
const expertClearCacheSpy = spyOn(expertStore, 'clearCache').mockImplementation(() => {})

import { LearningLoop, type ExecutionTrace } from './learning-loop'
import type { ExpertStore, Expertise } from './expert-store'

const createMockExpertise = (overrides?: Partial<Expertise>): Expertise => ({
  domain: 'test',
  version: '1.0.0',
  last_updated: new Date().toISOString(),
  last_updated_by: 'manual',
  confidence: 0.8,
  mental_model: {
    overview: 'Test expertise',
    architecture: { type: 'test' },
    key_files: [{ path: 'src/test.ts', purpose: 'Test file' }],
  },
  patterns: [],
  known_issues: [],
  changelog: [],
  ...overrides,
})

const createMockExpertStore = (): ExpertStore =>
  ({
    list: mock(() => Promise.resolve([{ id: 'test', domain: 'test', confidence: 0.8 }])),
    load: mock(() => Promise.resolve(createMockExpertise())),
    save: mock(() => Promise.resolve()),
    update: mock(() => Promise.resolve(createMockExpertise())),
    exists: mock(() => Promise.resolve(true)),
    addChangelogEntry: mock(() => Promise.resolve()),
    validate: mock(() => Promise.resolve({ valid: true, errors: [], warnings: [] })),
    getAgentPrompt: mock(() => Promise.resolve('test prompt')),
    clearCache: mock(() => {}),
  }) as unknown as ExpertStore

const createTrace = (overrides?: Partial<ExecutionTrace>): ExecutionTrace => ({
  agentId: 'agent-1',
  agentType: 'expert:test',
  expertId: 'test',
  sessionId: 'session-1',
  prompt: 'Test prompt',
  output: 'Test output',
  success: true,
  toolCalls: 5,
  durationMs: 10000,
  ...overrides,
})

describe('LearningLoop', () => {
  let learningLoop: LearningLoop
  let mockExpertStore: ExpertStore

  beforeEach(() => {
    mockExpertStore = createMockExpertStore()
    learningLoop = new LearningLoop({ autoLearnEnabled: true }, mockExpertStore)
  })

  afterEach(() => {
    learningLoop.removeAllListeners()
  })

  afterAll(() => {
    // Restore all spies to avoid polluting other test files
    graphAddEdgeSpy.mockRestore()
    graphGetRelatedSpy.mockRestore()
    storeAddSpy.mockRestore()
    storeSearchSpy.mockRestore()
    expertListSpy.mockRestore()
    expertLoadSpy.mockRestore()
    expertSaveSpy.mockRestore()
    expertUpdateSpy.mockRestore()
    expertExistsSpy.mockRestore()
    expertAddChangelogSpy.mockRestore()
    expertValidateSpy.mockRestore()
    expertGetAgentPromptSpy.mockRestore()
    expertClearCacheSpy.mockRestore()
  })

  describe('processExecution', () => {
    it('should return null when autoLearn is disabled', async () => {
      learningLoop = new LearningLoop({ autoLearnEnabled: false }, mockExpertStore)

      const result = await learningLoop.processExecution(createTrace())
      expect(result).toBeNull()
    })

    it('should return null when no expertId in trace', async () => {
      const trace = createTrace({ expertId: undefined })
      const result = await learningLoop.processExecution(trace)
      expect(result).toBeNull()
    })

    it('should return null when trace does not meet learning criteria', async () => {
      const trace = createTrace({
        toolCalls: 1,
        durationMs: 1000,
        success: true,
      })
      const result = await learningLoop.processExecution(trace)
      expect(result).toBeNull()
    })

    it('should return null when expert does not exist', async () => {
      mockExpertStore.exists = mock(() => Promise.resolve(false))
      const result = await learningLoop.processExecution(createTrace())
      expect(result).toBeNull()
    })

    it('should process successful execution and return learning result', async () => {
      const trace = createTrace({
        output: 'Used try { } catch pattern for error handling',
        toolCalls: 5,
      })

      const result = await learningLoop.processExecution(trace)

      expect(result).not.toBeNull()
      expect(result?.expertId).toBe('test')
      expect(result?.learned).toBe(true)
      expect(result?.changes.length).toBeGreaterThan(0)
    })

    it('should emit learning:started event', async () => {
      let eventReceived = false
      learningLoop.on('learning:started', () => {
        eventReceived = true
      })

      await learningLoop.processExecution(createTrace())

      expect(eventReceived).toBe(true)
    })

    it('should emit learning:completed event', async () => {
      let eventData: any = null
      learningLoop.on('learning:completed', (data) => {
        eventData = data
      })

      await learningLoop.processExecution(createTrace())

      expect(eventData).not.toBeNull()
      expect(eventData.expertId).toBe('test')
    })

    it('should emit learning:failed on error', async () => {
      mockExpertStore.load = mock(() => Promise.reject(new Error('Load failed')))

      let errorData: any = null
      learningLoop.on('learning:failed', (data) => {
        errorData = data
      })

      const result = await learningLoop.processExecution(createTrace())

      expect(result).toBeNull()
      expect(errorData).not.toBeNull()
      expect(errorData.error).toContain('Load failed')
    })
  })

  describe('pattern extraction', () => {
    it('should detect async iteration pattern', async () => {
      const trace = createTrace({
        output: 'for await (const chunk of reader) { process(chunk) }',
      })

      const result = await learningLoop.processExecution(trace)

      const patternChange = result?.changes.find(
        (c) => c.type === 'pattern' && c.description.includes('Async Iteration')
      )
      expect(patternChange).toBeDefined()
    })

    it('should detect error handling pattern', async () => {
      const trace = createTrace({
        output: 'try { doSomething() } catch (err) { handleError(err) }',
      })

      const result = await learningLoop.processExecution(trace)

      const patternChange = result?.changes.find(
        (c) => c.type === 'pattern' && c.description.includes('Error Handling')
      )
      expect(patternChange).toBeDefined()
    })

    it('should detect event listener pattern', async () => {
      const trace = createTrace({
        output: "emitter.on('data', handler)",
      })

      const result = await learningLoop.processExecution(trace)

      const patternChange = result?.changes.find(
        (c) => c.type === 'pattern' && c.description.includes('Event Listener')
      )
      expect(patternChange).toBeDefined()
    })

    it('should not add duplicate patterns', async () => {
      const expertiseWithPattern = createMockExpertise({
        patterns: [{ name: 'Error Handling', confidence: 0.9, usage: 'test' }],
      })
      mockExpertStore.load = mock(() => Promise.resolve(expertiseWithPattern))

      const trace = createTrace({
        output: 'try { } catch { }',
      })

      const result = await learningLoop.processExecution(trace)

      const patternChanges = result?.changes.filter(
        (c) => c.type === 'pattern' && c.description.includes('Error Handling')
      )
      expect(patternChanges?.length ?? 0).toBe(0)
    })

    it('should limit patterns to 3 per execution', async () => {
      const trace = createTrace({
        output: `
          for await (const x of y) { }
          emitter.on('event', fn)
          try { } catch { }
          Promise.all([a, b])
          new AbortController()
        `,
      })

      const result = await learningLoop.processExecution(trace)

      const patternChanges = result?.changes.filter((c) => c.type === 'pattern')
      expect(patternChanges?.length).toBeLessThanOrEqual(3)
    })
  })

  describe('issue extraction', () => {
    it('should extract issue from failed execution', async () => {
      const trace = createTrace({
        success: false,
        output: 'Error: Connection timeout after 30s',
      })

      const result = await learningLoop.processExecution(trace)

      const issueChange = result?.changes.find((c) => c.type === 'issue')
      expect(issueChange).toBeDefined()
      expect(issueChange?.description).toContain('issue')
    })

    it('should extract issue from error message', async () => {
      const trace = createTrace({
        success: false,
        output: 'Failed: Could not connect to database',
      })

      const result = await learningLoop.processExecution(trace)

      const issueChange = result?.changes.find((c) => c.type === 'issue')
      expect(issueChange).toBeDefined()
    })
  })

  describe('confidence updates', () => {
    it('should increase confidence on success', async () => {
      const trace = createTrace({ success: true })

      const result = await learningLoop.processExecution(trace)

      const confidenceChange = result?.changes.find((c) => c.type === 'confidence')
      expect(confidenceChange).toBeDefined()
      expect(confidenceChange?.description).toContain('increased')
    })

    it('should decrease confidence on failure', async () => {
      const trace = createTrace({ success: false })

      const result = await learningLoop.processExecution(trace)

      const confidenceChange = result?.changes.find((c) => c.type === 'confidence')
      expect(confidenceChange).toBeDefined()
      expect(confidenceChange?.description).toContain('decreased')
    })
  })

  describe('file extraction', () => {
    it('should extract new files from output', async () => {
      const trace = createTrace({
        output: 'modified: `src/newfile.ts` and created: `src/another.tsx`',
      })

      const result = await learningLoop.processExecution(trace)

      const fileChanges = result?.changes.filter((c) => c.type === 'file')
      expect(fileChanges?.length).toBeGreaterThan(0)
    })

    it('should not add already known files', async () => {
      const expertiseWithFiles = createMockExpertise({
        mental_model: {
          overview: 'test',
          architecture: { type: 'test' },
          key_files: [{ path: 'src/known.ts', purpose: 'Known file' }],
        },
      })
      mockExpertStore.load = mock(() => Promise.resolve(expertiseWithFiles))

      const trace = createTrace({
        output: 'file: src/known.ts was updated',
      })

      const result = await learningLoop.processExecution(trace)

      const fileChanges = result?.changes.filter(
        (c) => c.type === 'file' && c.description.includes('known.ts')
      )
      expect(fileChanges?.length ?? 0).toBe(0)
    })
  })

  describe('getHistory', () => {
    it('should return empty array for unknown expert', () => {
      const history = learningLoop.getHistory('unknown')
      expect(history).toEqual([])
    })

    it('should return traces after processing', async () => {
      await learningLoop.processExecution(createTrace())

      const history = learningLoop.getHistory('test')
      expect(history.length).toBe(1)
    })

    it('should limit history to 50 entries', async () => {
      for (let i = 0; i < 55; i++) {
        await learningLoop.processExecution(
          createTrace({
            agentId: `agent-${i}`,
            toolCalls: 5,
          })
        )
      }

      const history = learningLoop.getHistory('test')
      expect(history.length).toBe(50)
    })
  })

  describe('getStats', () => {
    it('should return zero stats initially', () => {
      const stats = learningLoop.getStats()

      expect(stats.totalExecutions).toBe(0)
      expect(stats.successRate).toBe(0)
      expect(Object.keys(stats.executionsByExpert).length).toBe(0)
    })

    it('should track stats after executions', async () => {
      await learningLoop.processExecution(createTrace({ success: true }))
      await learningLoop.processExecution(createTrace({ success: false }))

      const stats = learningLoop.getStats()

      expect(stats.totalExecutions).toBe(2)
      expect(stats.successRate).toBe(0.5)
      expect(stats.executionsByExpert['test']).toBe(2)
    })
  })

  describe('setAutoLearnEnabled', () => {
    it('should disable auto-learning', async () => {
      learningLoop.setAutoLearnEnabled(false)

      const result = await learningLoop.processExecution(createTrace())
      expect(result).toBeNull()
    })

    it('should re-enable auto-learning', async () => {
      learningLoop.setAutoLearnEnabled(false)
      learningLoop.setAutoLearnEnabled(true)

      const result = await learningLoop.processExecution(createTrace())
      expect(result).not.toBeNull()
    })
  })
})

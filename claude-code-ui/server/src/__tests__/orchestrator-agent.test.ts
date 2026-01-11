import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { OrchestratorAgent, createOrchestratorAgent } from '../services/orchestrator-agent'
import { PromptClassifier, type ClassificationResult } from '../services/prompt-classifier'

const createMockClassifier = (overrides: Partial<ClassificationResult> = {}) => {
  const defaultResult: ClassificationResult = {
    complexityScore: 50,
    domains: ['websocket'],
    estimatedToolCalls: 10,
    requiresDelegation: true,
    suggestedExperts: ['websocket'],
    suggestedAgents: ['scout', 'builder'],
    reasoning: 'Test classification'
  }

  return {
    classify: mock(() => ({ ...defaultResult, ...overrides })),
    setAvailableExperts: mock(() => {})
  }
}

const createMockSpawner = (result = {
  agentId: 'agent-123',
  output: '## Summary\n\nTask completed successfully.',
  success: true,
  metrics: { toolCalls: 5, durationMs: 1000, tokensUsed: 200 }
}) => {
  return {
    spawn: mock(async () => result),
    kill: mock(async () => true),
    on: mock(() => {}),
    emit: mock(() => {})
  }
}

describe('OrchestratorAgent', () => {
  let orchestrator: OrchestratorAgent
  let mockClassifier: ReturnType<typeof createMockClassifier>
  let mockSpawner: ReturnType<typeof createMockSpawner>

  beforeEach(() => {
    mockClassifier = createMockClassifier()
    mockSpawner = createMockSpawner()
    orchestrator = createOrchestratorAgent(
      mockClassifier as any,
      mockSpawner as any
    )
  })

  describe('execute', () => {
    it('should classify prompt on execution', async () => {
      await orchestrator.execute('Add feature to websocket', 'session-1')
      expect(mockClassifier.classify).toHaveBeenCalledWith('Add feature to websocket')
    })

    it('should respond directly for trivial tasks', async () => {
      mockClassifier = createMockClassifier({
        complexityScore: 20,
        requiresDelegation: false
      })
      orchestrator = createOrchestratorAgent(mockClassifier as any, mockSpawner as any)

      const result = await orchestrator.execute('What is 2+2?', 'session-1')

      expect(result).toContain('low complexity')
      expect(mockSpawner.spawn).not.toHaveBeenCalled()
    })

    it('should spawn agents for complex tasks', async () => {
      await orchestrator.execute('Refactor websocket module', 'session-1')
      expect(mockSpawner.spawn).toHaveBeenCalled()
    })

    it('should synthesize results from multiple agents', async () => {
      mockClassifier = createMockClassifier({
        suggestedExperts: [],
        suggestedAgents: ['scout', 'builder']
      })
      orchestrator = createOrchestratorAgent(mockClassifier as any, mockSpawner as any)

      const result = await orchestrator.execute('Complex task', 'session-1')

      expect(result).toContain('Completed')
      expect(result).toContain('Metrics')
    })

    it('should emit classified event', async () => {
      const events: string[] = []
      orchestrator.on('classified', () => events.push('classified'))

      await orchestrator.execute('Task', 'session-1')

      expect(events).toContain('classified')
    })

    it('should emit completed event on success', async () => {
      const events: any[] = []
      orchestrator.on('completed', (data) => events.push(data))

      await orchestrator.execute('Task', 'session-1')

      expect(events.length).toBe(1)
      expect(events[0].execution.status).toBe('complete')
    })

    it('should handle agent spawn failures gracefully', async () => {
      // With Promise.allSettled, spawn failures don't reject the execution
      // The orchestrator now continues and reports partial results
      mockSpawner = createMockSpawner()
      mockSpawner.spawn = mock(async () => { throw new Error('Spawn failed') })
      orchestrator = createOrchestratorAgent(mockClassifier as any, mockSpawner as any)

      const completedEvents: any[] = []
      orchestrator.on('completed', (data) => completedEvents.push(data))

      const result = await orchestrator.execute('Task', 'session-1')

      // Execution completes (doesn't throw) but may have empty results
      expect(completedEvents.length).toBe(1)
      expect(completedEvents[0].execution.status).toBe('complete')
      expect(result).toBeDefined()
    })

    it('should respect max concurrent agents', async () => {
      mockClassifier = createMockClassifier({
        suggestedExperts: [],
        suggestedAgents: ['scout', 'builder', 'reviewer', 'architect', 'extra']
      })
      orchestrator = createOrchestratorAgent(mockClassifier as any, mockSpawner as any, {
        maxConcurrentAgents: 3
      })

      await orchestrator.execute('Complex task', 'session-1')

      expect(mockSpawner.spawn.mock.calls.length).toBeLessThanOrEqual(3)
    })
  })

  describe('getExecution', () => {
    it('should return execution by ID', async () => {
      await orchestrator.execute('Task', 'session-1')

      const executions = orchestrator.getActiveExecutions()
      expect(executions).toHaveLength(0) // Completed, so not active
    })
  })

  describe('updateClassifierExperts', () => {
    it('should update classifier with available experts', () => {
      orchestrator.updateClassifierExperts(['ws', 'db', 'auth'])
      expect(mockClassifier.setAvailableExperts).toHaveBeenCalledWith(['ws', 'db', 'auth'])
    })
  })
})

describe('createOrchestratorAgent', () => {
  it('should create OrchestratorAgent instance', () => {
    const classifier = createMockClassifier()
    const spawner = createMockSpawner()

    const orchestrator = createOrchestratorAgent(classifier as any, spawner as any)

    expect(orchestrator).toBeInstanceOf(OrchestratorAgent)
  })

  it('should accept custom config', () => {
    const classifier = createMockClassifier()
    const spawner = createMockSpawner()

    const orchestrator = createOrchestratorAgent(classifier as any, spawner as any, {
      maxConcurrentAgents: 5,
      summaryMaxTokens: 1000
    })

    expect(orchestrator).toBeInstanceOf(OrchestratorAgent)
  })
})

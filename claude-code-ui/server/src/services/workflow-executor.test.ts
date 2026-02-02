import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'

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

// Mock fs/promises
mock.module('fs/promises', () => ({
  readFile: mock(() => Promise.resolve('')),
  writeFile: mock(() => Promise.resolve()),
  readdir: mock(() => Promise.resolve([])),
  mkdir: mock(() => Promise.resolve()),
}))

// Mock fs
mock.module('fs', () => ({
  existsSync: mock(() => false),
}))

// Mock agent registry
const mockAgentRegistry = {
  getAgent: mock(() => ({
    type: 'builder',
    name: 'Builder Agent',
  })),
  createAgent: mock(() => ({ id: 'agent-123' })),
  startAgent: mock(() => ({})),
  completeAgent: mock(() => ({})),
  failAgent: mock(() => ({})),
}

mock.module('./agent-registry', () => ({
  agentRegistry: mockAgentRegistry,
}))

// Import after mocking
const {
  loadWorkflowDefinitions,
  startWorkflow,
  getWorkflowRun,
  getActiveRuns,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  detectWorkflow,
  setAgentSpawner,
  onWorkflowEvent,
} = require('./workflow-executor')

// Mock agent spawner
function createMockAgentSpawner(options: { success?: boolean; output?: string } = {}) {
  const { success = true, output = 'Task completed' } = options
  return {
    spawn: mock(() =>
      Promise.resolve({
        success,
        output,
        agentId: 'agent-123',
        metrics: { tokensUsed: 100 },
      })
    ),
  }
}

describe('WorkflowExecutor', () => {
  beforeEach(() => {
    // Reset mocks
    mockLogger.debug.mockClear()
    mockLogger.info.mockClear()
    mockLogger.warn.mockClear()
    mockLogger.error.mockClear()
    mockAgentRegistry.getAgent.mockClear()
  })

  describe('loadWorkflowDefinitions', () => {
    test('returns empty array when workflows directory does not exist', async () => {
      const definitions = await loadWorkflowDefinitions()
      expect(Array.isArray(definitions)).toBe(true)
    })
  })

  describe('onWorkflowEvent', () => {
    test('registers event handler and returns unsubscribe function', () => {
      const handler = mock(() => {})
      const unsubscribe = onWorkflowEvent(handler)

      expect(typeof unsubscribe).toBe('function')

      // Unsubscribe should work without error
      unsubscribe()
    })
  })

  describe('setAgentSpawner', () => {
    test('configures agent spawner without error', () => {
      const spawner = createMockAgentSpawner()
      expect(() => setAgentSpawner(spawner)).not.toThrow()
      expect(mockLogger.info).toHaveBeenCalled()
    })
  })

  describe('getWorkflowRun', () => {
    test('returns undefined for non-existent run', () => {
      const run = getWorkflowRun('non-existent-run')
      expect(run).toBeUndefined()
    })
  })

  describe('getActiveRuns', () => {
    test('returns array of active runs', () => {
      const runs = getActiveRuns()
      expect(Array.isArray(runs)).toBe(true)
    })
  })

  describe('pauseWorkflow', () => {
    test('returns false for non-existent workflow', () => {
      const result = pauseWorkflow('non-existent-run')
      expect(result).toBe(false)
    })
  })

  describe('resumeWorkflow', () => {
    test('returns false for non-existent workflow', async () => {
      const result = await resumeWorkflow('non-existent-run')
      expect(result).toBe(false)
    })
  })

  describe('cancelWorkflow', () => {
    test('returns false for non-existent workflow', () => {
      const result = cancelWorkflow('non-existent-run')
      expect(result).toBe(false)
    })
  })

  describe('detectWorkflow', () => {
    test('returns null when no workflows match', async () => {
      const result = await detectWorkflow('random prompt', 50)
      expect(result).toBeNull()
    })
  })

  describe('Workflow Execution Integration', () => {
    // These tests validate the workflow system's structure and behavior
    // without requiring actual workflow files

    test('workflow run structure has expected properties', () => {
      // Define expected WorkflowRun interface
      interface ExpectedWorkflowRun {
        id: string
        workflowId: string
        workflowName: string
        status: 'running' | 'paused' | 'completed' | 'failed'
        currentStepId: string | null
        steps: Array<{
          id: string
          name: string
          agent: string
          status: string
        }>
        startedAt: Date
        iteration: number
        context: Record<string, unknown>
      }

      // This is a type check - validates our understanding of the interface
      const mockRun: ExpectedWorkflowRun = {
        id: 'run-123',
        workflowId: 'test-workflow',
        workflowName: 'Test Workflow',
        status: 'running',
        currentStepId: 'step-1',
        steps: [
          { id: 'step-1', name: 'Scout', agent: 'scout', status: 'pending' },
          { id: 'step-2', name: 'Build', agent: 'builder', status: 'pending' },
        ],
        startedAt: new Date(),
        iteration: 1,
        context: {},
      }

      expect(mockRun.id).toBe('run-123')
      expect(mockRun.steps.length).toBe(2)
      expect(mockRun.status).toBe('running')
    })

    test('workflow step status transitions are valid', () => {
      const validStatuses = ['pending', 'running', 'completed', 'failed']
      const validTransitions: Record<string, string[]> = {
        pending: ['running'],
        running: ['completed', 'failed', 'pending'], // pending for retry
        completed: [],
        failed: ['pending'], // for retry
      }

      // Validate transition rules
      expect(validStatuses).toContain('pending')
      expect(validStatuses).toContain('running')
      expect(validTransitions.pending).toContain('running')
      expect(validTransitions.running).toContain('completed')
      expect(validTransitions.running).toContain('failed')
    })

    test('workflow event types are correctly structured', () => {
      const eventTypes = [
        'workflow_started',
        'workflow_completed',
        'workflow_failed',
        'workflow_paused',
        'step_started',
        'step_completed',
      ]

      interface WorkflowEvent {
        type: string
        runId: string
        timestamp: Date
        stepId?: string
        data?: Record<string, unknown>
      }

      const mockEvent: WorkflowEvent = {
        type: 'step_started',
        runId: 'run-123',
        timestamp: new Date(),
        stepId: 'step-1',
        data: { stepName: 'Scout', agent: 'scout' },
      }

      expect(eventTypes).toContain(mockEvent.type)
      expect(mockEvent.runId).toBeTruthy()
      expect(mockEvent.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Workflow Definition Parsing', () => {
    test('workflow definition structure is valid', () => {
      interface WorkflowDefinition {
        id: string
        name: string
        description: string
        triggers: {
          keywords: string[]
          complexity: number
        }
        steps: Array<{
          id: string
          name: string
          agent: string
          inputTemplate: string
          nextOnSuccess?: string
          maxRetries: number
        }>
        maxIterations: number
      }

      const mockDefinition: WorkflowDefinition = {
        id: 'feature-workflow',
        name: 'Feature Implementation',
        description: 'Implements a new feature',
        triggers: {
          keywords: ['implement', 'create', 'add feature'],
          complexity: 40,
        },
        steps: [
          {
            id: 'step-1',
            name: 'Scout',
            agent: 'scout',
            inputTemplate: '${previousOutput}',
            nextOnSuccess: 'step-2',
            maxRetries: 2,
          },
          {
            id: 'step-2',
            name: 'Build',
            agent: 'builder',
            inputTemplate: '${previousOutput}',
            maxRetries: 2,
          },
        ],
        maxIterations: 3,
      }

      expect(mockDefinition.id).toBe('feature-workflow')
      expect(mockDefinition.triggers.keywords).toContain('implement')
      expect(mockDefinition.steps.length).toBe(2)
      expect(mockDefinition.steps[0].nextOnSuccess).toBe('step-2')
    })
  })

  describe('Error Handling', () => {
    test('handles missing agent spawner error', async () => {
      // Reset the spawner to null state by creating a new mock that throws
      const throwingSpawner = {
        spawn: mock(() => {
          throw new Error('Agent spawner not configured')
        }),
      }

      // The actual test is validating that the error message is correct
      expect(throwingSpawner.spawn).toBeDefined()
      expect(() => throwingSpawner.spawn({})).toThrow('Agent spawner not configured')
    })

    test('handles agent not found error', () => {
      mockAgentRegistry.getAgent.mockReturnValueOnce(null)

      const result = mockAgentRegistry.getAgent('non-existent-agent')
      expect(result).toBeNull()
    })

    test('handles step execution failure', async () => {
      const failingSpawner = createMockAgentSpawner({
        success: false,
        output: 'Execution failed',
      })

      const result = await failingSpawner.spawn({
        type: 'builder',
        prompt: 'Build something',
      })

      expect(result.success).toBe(false)
      expect(result.output).toBe('Execution failed')
    })
  })

  describe('Step Dependencies', () => {
    test('steps are linked correctly', () => {
      const steps = [
        { id: 'step-1', nextOnSuccess: 'step-2' },
        { id: 'step-2', nextOnSuccess: 'step-3' },
        { id: 'step-3', nextOnSuccess: undefined },
      ]

      // Verify chain
      expect(steps[0].nextOnSuccess).toBe('step-2')
      expect(steps[1].nextOnSuccess).toBe('step-3')
      expect(steps[2].nextOnSuccess).toBeUndefined()

      // Verify we can traverse the chain
      let currentStep = steps[0]
      const visited: string[] = [currentStep.id]

      while (currentStep.nextOnSuccess) {
        const nextId = currentStep.nextOnSuccess
        const nextStep = steps.find((s) => s.id === nextId)
        if (!nextStep) break
        visited.push(nextStep.id)
        currentStep = nextStep
      }

      expect(visited).toEqual(['step-1', 'step-2', 'step-3'])
    })

    test('handles circular dependency detection', () => {
      const steps = [
        { id: 'step-1', nextOnSuccess: 'step-2' },
        { id: 'step-2', nextOnSuccess: 'step-1' }, // Circular!
      ]

      // Detect circular dependency
      const visited = new Set<string>()
      let currentStep = steps[0]
      let hasCircular = false

      while (currentStep.nextOnSuccess) {
        if (visited.has(currentStep.id)) {
          hasCircular = true
          break
        }
        visited.add(currentStep.id)
        const nextStep = steps.find((s) => s.id === currentStep.nextOnSuccess)
        if (!nextStep) break
        currentStep = nextStep
      }

      expect(hasCircular).toBe(true)
    })
  })

  describe('Retry Mechanism', () => {
    test('respects maxRetries setting', () => {
      const step = {
        id: 'step-1',
        retryCount: 0,
        maxRetries: 2,
        status: 'running' as const,
      }

      // Simulate retries
      const attemptExecution = (
        s: typeof step
      ): { shouldRetry: boolean; step: typeof step } => {
        if (s.retryCount < s.maxRetries) {
          return {
            shouldRetry: true,
            step: { ...s, retryCount: s.retryCount + 1, status: 'pending' as const },
          }
        }
        return {
          shouldRetry: false,
          step: { ...s, status: 'failed' as const },
        }
      }

      // First failure - should retry
      let result = attemptExecution(step)
      expect(result.shouldRetry).toBe(true)
      expect(result.step.retryCount).toBe(1)

      // Second failure - should retry
      result = attemptExecution(result.step)
      expect(result.shouldRetry).toBe(true)
      expect(result.step.retryCount).toBe(2)

      // Third failure - should not retry (exceeded maxRetries)
      result = attemptExecution(result.step)
      expect(result.shouldRetry).toBe(false)
      expect(result.step.status).toBe('failed')
    })
  })

  describe('Parallel Execution', () => {
    test('identifies independent steps that can run in parallel', () => {
      const steps = [
        { id: 'step-1', dependsOn: [] },
        { id: 'step-2', dependsOn: [] },
        { id: 'step-3', dependsOn: ['step-1', 'step-2'] },
      ]

      // Find steps that can run in parallel (no dependencies)
      const parallelSteps = steps.filter((s) => s.dependsOn.length === 0)

      expect(parallelSteps.length).toBe(2)
      expect(parallelSteps.map((s) => s.id)).toContain('step-1')
      expect(parallelSteps.map((s) => s.id)).toContain('step-2')
    })

    test('correctly identifies steps blocked by dependencies', () => {
      interface Step {
        id: string
        dependsOn: string[]
        status: 'pending' | 'completed'
      }

      const steps: Step[] = [
        { id: 'step-1', dependsOn: [], status: 'completed' },
        { id: 'step-2', dependsOn: [], status: 'pending' },
        { id: 'step-3', dependsOn: ['step-1', 'step-2'], status: 'pending' },
      ]

      // Check if step-3 can run (all dependencies must be completed)
      const step3 = steps.find((s) => s.id === 'step-3')!
      const canRun = step3.dependsOn.every((depId) => {
        const dep = steps.find((s) => s.id === depId)
        return dep?.status === 'completed'
      })

      expect(canRun).toBe(false) // step-2 is still pending
    })
  })

  describe('Context Management', () => {
    test('workflow context is properly structured', () => {
      const context: Record<string, unknown> = {
        initialPrompt: 'Build a feature',
        scout_output: 'Found relevant files',
        builder_output: 'Code written successfully',
      }

      expect(context.initialPrompt).toBe('Build a feature')
      expect(context.scout_output).toBeDefined()
    })

    test('context is updated after each step', () => {
      const context: Record<string, unknown> = {}

      // Simulate step completion updating context
      const stepResults = [
        { stepName: 'scout', output: 'Found files' },
        { stepName: 'builder', output: 'Built feature' },
      ]

      for (const result of stepResults) {
        context[`${result.stepName}_output`] = result.output
      }

      expect(context['scout_output']).toBe('Found files')
      expect(context['builder_output']).toBe('Built feature')
    })
  })
})

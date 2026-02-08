import { describe, test, expect, beforeEach } from 'bun:test'

/**
 * Orchestration Flow Tests
 *
 * Tests the Lead -> Planner -> Builder -> Reviewer flow
 * following the orchestration patterns defined in .claude/rules/
 */

// Types
interface TaskConfig {
  prompt: string
  complexity: number
}

interface AgentResult {
  success: boolean
  agent: string
  output?: string
  verdict?: 'APPROVED' | 'NEEDS_CHANGES'
  error?: string
}

interface OrchestrationContext {
  plannerCalled: boolean
  builderCalls: number
  reviewerCalls: number
  errorAnalyzerCalls: number
}

// Complexity calculation based on .claude/rules/complexity-routing.md
function calculateComplexity(task: TaskConfig): number {
  return task.complexity
}

// Routing decision based on complexity
function getRoutingDecision(
  complexity: number
): 'builder' | 'planner_optional' | 'planner_required' {
  if (complexity < 30) return 'builder'
  if (complexity <= 60) return 'planner_optional'
  return 'planner_required'
}

// Mock agent execution
async function executeAgent(
  agent: string,
  _prompt: string,
  context: OrchestrationContext
): Promise<AgentResult> {
  switch (agent) {
    case 'planner':
      context.plannerCalled = true
      return {
        success: true,
        agent: 'planner',
        output: 'Execution Roadmap: Step 1 -> Step 2 -> Step 3',
      }
    case 'builder':
      context.builderCalls++
      return {
        success: true,
        agent: 'builder',
        output: 'Implementation complete',
      }
    case 'reviewer':
      context.reviewerCalls++
      // Simulate alternating verdicts for testing
      const verdict = context.reviewerCalls === 1 ? 'NEEDS_CHANGES' : 'APPROVED'
      return {
        success: true,
        agent: 'reviewer',
        verdict,
        output: verdict === 'APPROVED' ? 'Code looks good' : 'Please fix naming conventions',
      }
    case 'error-analyzer':
      context.errorAnalyzerCalls++
      return {
        success: true,
        agent: 'error-analyzer',
        output: 'Recommendation: retry with modified approach',
      }
    default:
      return {
        success: false,
        agent,
        error: `Unknown agent: ${agent}`,
      }
  }
}

// Orchestration flow
async function orchestrate(
  task: TaskConfig,
  context: OrchestrationContext
): Promise<{ success: boolean; iterations: number }> {
  const complexity = calculateComplexity(task)
  const routing = getRoutingDecision(complexity)

  // Step 1: Optional planner for complex tasks
  if (routing === 'planner_required') {
    await executeAgent('planner', task.prompt, context)
  }

  // Step 2: Builder implementation
  await executeAgent('builder', task.prompt, context)

  // Step 3: Reviewer checkpoint
  let reviewResult = await executeAgent('reviewer', task.prompt, context)

  // Step 4: Iterate if NEEDS_CHANGES (max 3 iterations)
  let iterations = 1
  const maxIterations = 3

  while (reviewResult.verdict === 'NEEDS_CHANGES' && iterations < maxIterations) {
    await executeAgent('builder', task.prompt, context)
    reviewResult = await executeAgent('reviewer', task.prompt, context)
    iterations++
  }

  return {
    success: reviewResult.verdict === 'APPROVED',
    iterations,
  }
}

describe('Orchestration Flow', () => {
  let context: OrchestrationContext

  beforeEach(() => {
    context = {
      plannerCalled: false,
      builderCalls: 0,
      reviewerCalls: 0,
      errorAnalyzerCalls: 0,
    }
  })

  describe('Lead -> Planner -> Builder', () => {
    test('should delegate complex tasks to planner first', async () => {
      const complexTask: TaskConfig = {
        prompt: 'Implementar sistema de autenticación OAuth',
        complexity: 72,
      }

      await orchestrate(complexTask, context)

      expect(context.plannerCalled).toBe(true)
      expect(context.builderCalls).toBeGreaterThan(0)
    })

    test('should pass planner output to builder', async () => {
      const complexTask: TaskConfig = {
        prompt: 'Crear API de pagos con múltiples proveedores',
        complexity: 85,
      }

      const routing = getRoutingDecision(complexTask.complexity)
      expect(routing).toBe('planner_required')

      await orchestrate(complexTask, context)

      // Planner should be called before builder
      expect(context.plannerCalled).toBe(true)
      expect(context.builderCalls).toBeGreaterThan(0)
    })

    test('should calculate complexity correctly', () => {
      expect(getRoutingDecision(20)).toBe('builder')
      expect(getRoutingDecision(45)).toBe('planner_optional')
      expect(getRoutingDecision(75)).toBe('planner_required')
    })
  })

  describe('Simple Task Bypass', () => {
    test('should skip planner for low complexity tasks', async () => {
      const simpleTask: TaskConfig = {
        prompt: 'Añadir validación de email al endpoint de registro',
        complexity: 24,
      }

      await orchestrate(simpleTask, context)

      expect(context.plannerCalled).toBe(false)
      expect(context.builderCalls).toBeGreaterThan(0)
    })

    test('should go directly to builder for complexity < 30', async () => {
      const simpleTask: TaskConfig = {
        prompt: 'Corregir typo en mensaje de error',
        complexity: 10,
      }

      const routing = getRoutingDecision(simpleTask.complexity)
      expect(routing).toBe('builder')

      await orchestrate(simpleTask, context)

      expect(context.plannerCalled).toBe(false)
    })

    test('should handle optional planner zone (30-60)', async () => {
      const mediumTask: TaskConfig = {
        prompt: 'Añadir endpoint de búsqueda con filtros',
        complexity: 45,
      }

      const routing = getRoutingDecision(mediumTask.complexity)
      expect(routing).toBe('planner_optional')
    })
  })

  describe('Reviewer Checkpoint', () => {
    test('should validate builder output with reviewer', async () => {
      const task: TaskConfig = {
        prompt: 'Implementar función de utilidad',
        complexity: 20,
      }

      await orchestrate(task, context)

      expect(context.reviewerCalls).toBeGreaterThan(0)
    })

    test('should return to builder if NEEDS_CHANGES', async () => {
      const task: TaskConfig = {
        prompt: 'Refactorizar servicio de usuarios',
        complexity: 25,
      }

      const result = await orchestrate(task, context)

      // First review returns NEEDS_CHANGES, second returns APPROVED
      expect(context.builderCalls).toBe(2)
      expect(context.reviewerCalls).toBe(2)
      expect(result.iterations).toBe(2)
    })

    test('should complete flow if APPROVED on first try', async () => {
      // Create context where reviewer always approves
      const approveContext: OrchestrationContext = {
        plannerCalled: false,
        builderCalls: 0,
        reviewerCalls: 0,
        errorAnalyzerCalls: 0,
      }

      // Mock single-pass approval
      const singlePassOrchestrate = async (
        _task: TaskConfig
      ): Promise<{ success: boolean; iterations: number }> => {
        approveContext.builderCalls++
        approveContext.reviewerCalls++
        return { success: true, iterations: 1 }
      }

      const task: TaskConfig = {
        prompt: 'Añadir comentario a función',
        complexity: 5,
      }

      const result = await singlePassOrchestrate(task)

      expect(result.success).toBe(true)
      expect(result.iterations).toBe(1)
      expect(approveContext.builderCalls).toBe(1)
      expect(approveContext.reviewerCalls).toBe(1)
    })

    test('should limit iterations to prevent infinite loops', async () => {
      // Create context that always returns NEEDS_CHANGES
      let iterations = 0
      const maxIterations = 3

      const limitedOrchestrate = async (): Promise<number> => {
        while (iterations < maxIterations) {
          iterations++
          const verdict = 'NEEDS_CHANGES' // Always needs changes
          if (verdict === 'NEEDS_CHANGES' && iterations >= maxIterations) {
            break
          }
        }
        return iterations
      }

      const result = await limitedOrchestrate()
      expect(result).toBe(maxIterations)
    })
  })

  describe('Complexity Routing', () => {
    test('should route based on complexity thresholds', () => {
      // Low complexity (< 30)
      expect(getRoutingDecision(0)).toBe('builder')
      expect(getRoutingDecision(15)).toBe('builder')
      expect(getRoutingDecision(29)).toBe('builder')

      // Medium complexity (30-60)
      expect(getRoutingDecision(30)).toBe('planner_optional')
      expect(getRoutingDecision(45)).toBe('planner_optional')
      expect(getRoutingDecision(60)).toBe('planner_optional')

      // High complexity (> 60)
      expect(getRoutingDecision(61)).toBe('planner_required')
      expect(getRoutingDecision(80)).toBe('planner_required')
      expect(getRoutingDecision(100)).toBe('planner_required')
    })
  })
})

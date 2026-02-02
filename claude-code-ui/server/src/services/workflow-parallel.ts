/**
 * Parallel Workflow Execution - Agentic Layer Fase C
 *
 * Ejecuta múltiples workflows en paralelo y permite composición.
 */

import { logger } from '../logger'
import {
  startWorkflow,
  getWorkflowRun,
  cancelWorkflow,
} from './workflow-executor'
import type {
  WorkflowRun,
} from '@shared/types/workflow'

const log = logger.child('workflow-parallel')

export interface ParallelWorkflowConfig {
  maxConcurrent: number
  failFast: boolean // Stop all if one fails
  timeout: number // Total timeout for all workflows
}

export interface ParallelExecutionResult {
  id: string
  status: 'completed' | 'failed' | 'partial' | 'timeout'
  runs: WorkflowRun[]
  completedCount: number
  failedCount: number
  totalDuration: number
  errors: string[]
}

export interface CompositeWorkflow {
  id: string
  name: string
  description: string
  stages: Array<{
    name: string
    workflows: string[] // Workflow IDs to run in parallel
    condition?: 'all' | 'any' // Continue if all or any succeed
  }>
}

const DEFAULT_CONFIG: ParallelWorkflowConfig = {
  maxConcurrent: 3,
  failFast: false,
  timeout: 10 * 60 * 1000, // 10 minutes
}

// Active parallel executions
const parallelExecutions = new Map<string, ParallelExecutionResult>()

/**
 * Ejecuta múltiples workflows en paralelo
 */
export async function executeWorkflowsParallel(
  workflowIds: string[],
  contexts: Record<string, unknown>[] = [],
  config: Partial<ParallelWorkflowConfig> = {}
): Promise<ParallelExecutionResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const executionId = `parallel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const result: ParallelExecutionResult = {
    id: executionId,
    status: 'completed',
    runs: [],
    completedCount: 0,
    failedCount: 0,
    totalDuration: 0,
    errors: [],
  }

  parallelExecutions.set(executionId, result)
  const startTime = Date.now()

  log.info('Starting parallel workflow execution', {
    executionId,
    workflowCount: workflowIds.length,
  })

  try {
    // Batch workflows according to maxConcurrent
    const batches: string[][] = []
    for (let i = 0; i < workflowIds.length; i += cfg.maxConcurrent) {
      batches.push(workflowIds.slice(i, i + cfg.maxConcurrent))
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]

      // Start all workflows in this batch
      const runPromises = batch.map(async (workflowId, index) => {
        const globalIndex = batchIndex * cfg.maxConcurrent + index
        const context = contexts[globalIndex] || {}

        try {
          const run = await startWorkflow(workflowId, context)
          return { run, error: null }
        } catch (error) {
          return { run: null, error: String(error) }
        }
      })

      // Wait for batch to complete
      const batchResults = await Promise.all(runPromises)

      for (const { run, error } of batchResults) {
        if (run) {
          result.runs.push(run)

          // Wait for run to complete
          await waitForWorkflowCompletion(run.id, cfg.timeout)

          const finalRun = getWorkflowRun(run.id)
          if (finalRun) {
            if (finalRun.status === 'completed') {
              result.completedCount++
            } else if (finalRun.status === 'failed') {
              result.failedCount++
              result.errors.push(finalRun.error || 'Unknown error')

              if (cfg.failFast) {
                // Cancel remaining workflows
                for (const r of result.runs) {
                  if (r.status === 'running') {
                    cancelWorkflow(r.id)
                  }
                }
                result.status = 'failed'
                break
              }
            }
          }
        } else if (error) {
          result.failedCount++
          result.errors.push(error)

          if (cfg.failFast) {
            result.status = 'failed'
            break
          }
        }
      }

      // Check timeout
      if (Date.now() - startTime > cfg.timeout) {
        result.status = 'timeout'
        log.warn('Parallel execution timeout', { executionId })
        break
      }

      if (result.status === 'failed') break
    }

    // Determine final status
    result.totalDuration = Date.now() - startTime

    if (result.status !== 'failed' && result.status !== 'timeout') {
      if (result.failedCount > 0 && result.completedCount > 0) {
        result.status = 'partial'
      } else if (result.failedCount === workflowIds.length) {
        result.status = 'failed'
      }
    }

    log.info('Parallel execution completed', {
      executionId,
      status: result.status,
      completed: result.completedCount,
      failed: result.failedCount,
      duration: result.totalDuration,
    })

    return result
  } finally {
    parallelExecutions.delete(executionId)
  }
}

/**
 * Ejecuta un workflow compuesto (composición de workflows)
 */
export async function executeCompositeWorkflow(
  composite: CompositeWorkflow,
  initialContext: Record<string, unknown> = {}
): Promise<{
  success: boolean
  stageResults: Array<{
    stage: string
    result: ParallelExecutionResult
  }>
  finalContext: Record<string, unknown>
}> {
  log.info('Starting composite workflow', { id: composite.id, stages: composite.stages.length })

  const stageResults: Array<{ stage: string; result: ParallelExecutionResult }> = []
  let context = { ...initialContext }

  for (const stage of composite.stages) {
    log.info(`Executing stage: ${stage.name}`, { workflows: stage.workflows })

    // Create contexts for each workflow in the stage
    const contexts = stage.workflows.map(() => ({ ...context }))

    const result = await executeWorkflowsParallel(stage.workflows, contexts)
    stageResults.push({ stage: stage.name, result })

    // Check stage condition
    const condition = stage.condition || 'all'
    const shouldContinue =
      condition === 'all'
        ? result.failedCount === 0
        : result.completedCount > 0

    if (!shouldContinue) {
      log.warn(`Stage ${stage.name} failed condition: ${condition}`)
      return {
        success: false,
        stageResults,
        finalContext: context,
      }
    }

    // Merge outputs from all runs into context
    for (const run of result.runs) {
      if (run.status === 'completed') {
        context = { ...context, ...run.context }
      }
    }
  }

  log.info('Composite workflow completed', { id: composite.id })

  return {
    success: true,
    stageResults,
    finalContext: context,
  }
}

/**
 * Espera a que un workflow complete
 */
async function waitForWorkflowCompletion(
  runId: string,
  timeout: number
): Promise<void> {
  const startTime = Date.now()

  return new Promise<void>(resolve => {
    const checkInterval = setInterval(() => {
      const run = getWorkflowRun(runId)

      if (!run || run.status !== 'running') {
        clearInterval(checkInterval)
        resolve()
        return
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval)
        cancelWorkflow(runId)
        resolve()
      }
    }, 500)
  })
}

/**
 * Crea un workflow compuesto desde definición
 */
export function createCompositeWorkflow(
  id: string,
  name: string,
  stages: CompositeWorkflow['stages']
): CompositeWorkflow {
  return {
    id,
    name,
    description: `Composite: ${stages.map(s => s.name).join(' → ')}`,
    stages,
  }
}

/**
 * Workflow compuesto predefinido: Full Dev Cycle
 */
export const FULL_DEV_CYCLE = createCompositeWorkflow(
  'full-dev-cycle',
  'Full Development Cycle',
  [
    {
      name: 'Analysis',
      workflows: ['dev-cycle'], // Scout + Architect
      condition: 'all',
    },
    {
      name: 'Implementation',
      workflows: ['dev-cycle'], // Builder
      condition: 'all',
    },
    {
      name: 'Quality',
      workflows: ['refactor'], // Review + Code Quality
      condition: 'any', // Continue even if some quality checks fail
    },
  ]
)

/**
 * Obtiene ejecuciones paralelas activas
 */
export function getActiveParallelExecutions(): ParallelExecutionResult[] {
  return Array.from(parallelExecutions.values())
}

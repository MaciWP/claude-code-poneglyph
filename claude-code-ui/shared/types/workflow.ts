/**
 * Workflow Types - Agentic Layer Fase B
 *
 * Tipos para el sistema de workflows E2E.
 */

export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused'

export interface WorkflowStepResult {
  output: string
  artifacts?: Record<string, unknown>
  duration: number
  tokensUsed?: number
  error?: string
}

export interface WorkflowStep {
  id: string
  name: string
  agent: string
  status: WorkflowStepStatus
  input?: string
  result?: WorkflowStepResult
  startedAt?: Date
  completedAt?: Date
  retryCount: number
  maxRetries: number
  dependsOn?: string[] // IDs de steps que deben completarse primero
}

export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  triggers: {
    keywords: string[]
    complexity?: number
  }
  steps: Array<{
    id: string
    name: string
    agent: string
    inputTemplate: string
    nextOnSuccess?: string
    nextOnFailure?: string
    maxRetries?: number
  }>
  parallelSteps?: string[][] // Grupos de steps que pueden ejecutarse en paralelo
  maxIterations: number
}

export interface WorkflowRun {
  id: string
  workflowId: string
  workflowName: string
  status: WorkflowStatus
  currentStepId: string | null
  steps: WorkflowStep[]
  startedAt: Date
  completedAt?: Date
  iteration: number
  maxIterations: number
  context: Record<string, unknown> // Datos compartidos entre steps
  error?: string
  totalDuration?: number
  totalTokens?: number
}

export interface WorkflowEvent {
  type: 'workflow_started' | 'step_started' | 'step_completed' | 'step_failed' | 'workflow_completed' | 'workflow_failed' | 'workflow_paused'
  runId: string
  stepId?: string
  timestamp: Date
  data?: Record<string, unknown>
}

export interface WorkflowLogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  runId: string
  stepId?: string
  message: string
  data?: Record<string, unknown>
}

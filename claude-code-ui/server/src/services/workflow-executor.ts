/**
 * Workflow Executor - Agentic Layer Fase B
 *
 * Ejecuta workflows E2E con state machine, auto-recovery y logging.
 */

import { readFile, writeFile, readdir, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { logger } from '../logger'
import { agentRegistry } from './agent-registry'
import type {
  WorkflowDefinition,
  WorkflowRun,
  WorkflowStep,
  WorkflowStatus,
  WorkflowStepStatus,
  WorkflowEvent,
  WorkflowLogEntry,
} from '../../../shared/types/workflow'

const log = logger.child('workflow-executor')

// Event emitter para workflow events
type WorkflowEventHandler = (event: WorkflowEvent) => void
const eventHandlers: WorkflowEventHandler[] = []

export function onWorkflowEvent(handler: WorkflowEventHandler): () => void {
  eventHandlers.push(handler)
  return () => {
    const index = eventHandlers.indexOf(handler)
    if (index > -1) eventHandlers.splice(index, 1)
  }
}

function emitEvent(event: WorkflowEvent): void {
  for (const handler of eventHandlers) {
    try {
      handler(event)
    } catch (error) {
      log.warn('Workflow event handler error', { error: String(error) })
    }
  }
}

// Cache de workflow definitions
const workflowCache = new Map<string, WorkflowDefinition>()
const activeRuns = new Map<string, WorkflowRun>()

// Paths
const WORKFLOWS_DIR = join(process.cwd(), '..', '..', '.claude', 'workflows')
const RUNS_DIR = join(process.cwd(), '..', 'data', 'workflow-runs')

/**
 * Carga todas las definiciones de workflows
 */
export async function loadWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  const definitions: WorkflowDefinition[] = []

  try {
    if (!existsSync(WORKFLOWS_DIR)) {
      log.info('Workflows directory does not exist', { path: WORKFLOWS_DIR })
      return definitions
    }

    const files = await readdir(WORKFLOWS_DIR)
    const mdFiles = files.filter(f => f.endsWith('.md'))

    for (const file of mdFiles) {
      try {
        const content = await readFile(join(WORKFLOWS_DIR, file), 'utf-8')
        const definition = parseWorkflowMd(file.replace('.md', ''), content)
        if (definition) {
          definitions.push(definition)
          workflowCache.set(definition.id, definition)
        }
      } catch (error) {
        log.warn(`Failed to parse workflow: ${file}`, { error: String(error) })
      }
    }

    log.info('Loaded workflow definitions', { count: definitions.length })
  } catch (error) {
    log.error('Failed to load workflow definitions', { error: String(error) })
  }

  return definitions
}

/**
 * Parsea un archivo .md de workflow a WorkflowDefinition
 */
function parseWorkflowMd(id: string, content: string): WorkflowDefinition | null {
  const lines = content.split('\n')

  // Extract title
  const titleMatch = lines[0]?.match(/^#\s+Workflow:\s+(.+)$/i)
  const name = titleMatch?.[1] || id

  // Extract description
  const descLine = lines.find(l => l.trim() && !l.startsWith('#'))
  const description = descLine?.trim() || ''

  // Extract keywords from Trigger section
  const keywords: string[] = []
  let complexity = 0
  const triggerSection = extractSection(content, 'Trigger')
  if (triggerSection) {
    const keywordsMatch = triggerSection.match(/Keywords\s*\|\s*`([^`]+)`/)
    if (keywordsMatch) {
      keywords.push(...keywordsMatch[1].split(',').map(k => k.trim().replace(/`/g, '')))
    }
    const complexityMatch = triggerSection.match(/Complexity\s*\|\s*>=?\s*(\d+)/)
    if (complexityMatch) {
      complexity = parseInt(complexityMatch[1], 10)
    }
  }

  // Extract steps
  const steps: WorkflowDefinition['steps'] = []
  const stepSections = content.match(/###\s+Step\s+\d+:\s+\w+[\s\S]*?(?=###|$)/g) || []

  for (const section of stepSections) {
    const stepMatch = section.match(/###\s+Step\s+(\d+):\s+(\w+)/)
    if (!stepMatch) continue

    const stepNumber = stepMatch[1]
    const stepName = stepMatch[2]

    const agentMatch = section.match(/Agent\s*\|\s*`([^`]+)`/)
    const nextMatch = section.match(/Next\s*\|\s*([^|]+)/)

    const agent = agentMatch?.[1] || stepName.toLowerCase()

    let nextOnSuccess: string | undefined
    if (nextMatch) {
      const nextText = nextMatch[1].trim()
      if (nextText.includes('Step')) {
        const nextStepMatch = nextText.match(/Step\s+(\d+)/)
        if (nextStepMatch) {
          nextOnSuccess = `step-${nextStepMatch[1]}`
        }
      }
    }

    steps.push({
      id: `step-${stepNumber}`,
      name: stepName,
      agent,
      inputTemplate: '${previousOutput}',
      nextOnSuccess,
      maxRetries: 2,
    })
  }

  // Link steps
  for (let i = 0; i < steps.length - 1; i++) {
    if (!steps[i].nextOnSuccess) {
      steps[i].nextOnSuccess = steps[i + 1].id
    }
  }

  // Extract max iterations from notes
  const notesSection = extractSection(content, 'Notes')
  let maxIterations = 3
  if (notesSection) {
    const iterMatch = notesSection.match(/(?:máximo|max)\s+(\d+)\s+iterat/i)
    if (iterMatch) {
      maxIterations = parseInt(iterMatch[1], 10)
    }
  }

  return {
    id,
    name,
    description,
    triggers: { keywords, complexity },
    steps,
    maxIterations,
  }
}

function extractSection(content: string, sectionName: string): string | null {
  const regex = new RegExp(`##\\s+${sectionName}[\\s\\S]*?(?=##|$)`, 'i')
  const match = content.match(regex)
  return match ? match[0] : null
}

/**
 * Inicia un nuevo workflow run
 */
export async function startWorkflow(
  workflowId: string,
  initialContext: Record<string, unknown> = {}
): Promise<WorkflowRun> {
  const definition = workflowCache.get(workflowId) || (await loadWorkflowDefinitions()).find(w => w.id === workflowId)

  if (!definition) {
    throw new Error(`Workflow not found: ${workflowId}`)
  }

  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const steps: WorkflowStep[] = definition.steps.map(step => ({
    id: step.id,
    name: step.name,
    agent: step.agent,
    status: 'pending' as WorkflowStepStatus,
    retryCount: 0,
    maxRetries: step.maxRetries || 2,
  }))

  const run: WorkflowRun = {
    id: runId,
    workflowId: definition.id,
    workflowName: definition.name,
    status: 'running',
    currentStepId: steps[0]?.id || null,
    steps,
    startedAt: new Date(),
    iteration: 1,
    maxIterations: definition.maxIterations,
    context: initialContext,
  }

  activeRuns.set(runId, run)

  emitEvent({
    type: 'workflow_started',
    runId,
    timestamp: new Date(),
    data: { workflowId, workflowName: definition.name },
  })

  await logWorkflow(run, 'info', 'Workflow started', { workflowId, context: initialContext })

  // Start execution (non-blocking)
  executeWorkflow(run).catch(error => {
    log.error('Workflow execution failed', { runId, error: String(error) })
  })

  return run
}

/**
 * Ejecuta el workflow paso a paso
 */
async function executeWorkflow(run: WorkflowRun): Promise<void> {
  const definition = workflowCache.get(run.workflowId)
  if (!definition) {
    run.status = 'failed'
    run.error = 'Workflow definition not found'
    return
  }

  while (run.status === 'running' && run.currentStepId) {
    const step = run.steps.find(s => s.id === run.currentStepId)
    if (!step) break

    try {
      await executeStep(run, step, definition)

      // Determine next step
      const stepDef = definition.steps.find(s => s.id === step.id)
      if (step.status === 'completed' && stepDef?.nextOnSuccess) {
        run.currentStepId = stepDef.nextOnSuccess
      } else if (step.status === 'failed' && stepDef?.nextOnFailure) {
        run.currentStepId = stepDef.nextOnFailure
      } else {
        // No more steps
        run.currentStepId = null
      }
    } catch (error) {
      step.status = 'failed'
      step.result = {
        output: '',
        error: String(error),
        duration: 0,
      }

      // Try auto-recovery
      if (step.retryCount < step.maxRetries) {
        step.retryCount++
        step.status = 'pending'
        await logWorkflow(run, 'warn', `Retrying step ${step.name}`, { retryCount: step.retryCount })
      } else {
        run.status = 'failed'
        run.error = `Step ${step.name} failed after ${step.maxRetries} retries`
        break
      }
    }
  }

  // Finalize
  if (run.status === 'running') {
    run.status = 'completed'
    run.completedAt = new Date()
    run.totalDuration = run.completedAt.getTime() - run.startedAt.getTime()

    emitEvent({
      type: 'workflow_completed',
      runId: run.id,
      timestamp: new Date(),
      data: { duration: run.totalDuration },
    })

    await logWorkflow(run, 'info', 'Workflow completed', { duration: run.totalDuration })
  } else if (run.status === 'failed') {
    emitEvent({
      type: 'workflow_failed',
      runId: run.id,
      timestamp: new Date(),
      data: { error: run.error },
    })

    await logWorkflow(run, 'error', 'Workflow failed', { error: run.error })
  }

  // Persist run
  await persistRun(run)
  activeRuns.delete(run.id)
}

/**
 * Ejecuta un step individual
 */
async function executeStep(
  run: WorkflowRun,
  step: WorkflowStep,
  definition: WorkflowDefinition
): Promise<void> {
  step.status = 'running'
  step.startedAt = new Date()

  emitEvent({
    type: 'step_started',
    runId: run.id,
    stepId: step.id,
    timestamp: new Date(),
    data: { stepName: step.name, agent: step.agent },
  })

  await logWorkflow(run, 'info', `Starting step: ${step.name}`, { agent: step.agent })

  // Get agent
  const agent = agentRegistry.getAgent(step.agent)
  if (!agent) {
    throw new Error(`Agent not found: ${step.agent}`)
  }

  // Build input from previous step output + context
  const previousStep = run.steps.find(s => s.status === 'completed' && s.id !== step.id)
  const input = step.input || previousStep?.result?.output || JSON.stringify(run.context)

  // Execute agent (simplified - in real impl would spawn Task)
  const startTime = Date.now()

  // Simulate agent execution for now
  // In real implementation, this would use agent-spawner to run the agent
  await new Promise(resolve => setTimeout(resolve, 100))

  const duration = Date.now() - startTime

  step.result = {
    output: `[${step.agent}] Executed with input: ${input.slice(0, 100)}...`,
    duration,
    artifacts: {},
  }

  step.status = 'completed'
  step.completedAt = new Date()

  // Update context with step output
  run.context[`${step.name.toLowerCase()}_output`] = step.result.output

  emitEvent({
    type: 'step_completed',
    runId: run.id,
    stepId: step.id,
    timestamp: new Date(),
    data: { duration, output: step.result.output.slice(0, 200) },
  })

  await logWorkflow(run, 'info', `Completed step: ${step.name}`, { duration })
}

/**
 * Logging helpers
 */
async function logWorkflow(
  run: WorkflowRun,
  level: WorkflowLogEntry['level'],
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  const entry: WorkflowLogEntry = {
    timestamp: new Date(),
    level,
    runId: run.id,
    message,
    data,
  }

  log[level](message, { runId: run.id, ...data })

  // Also write to log file
  try {
    if (!existsSync(RUNS_DIR)) {
      await mkdir(RUNS_DIR, { recursive: true })
    }

    const logPath = join(RUNS_DIR, `${run.id}.ndjson`)
    const line = JSON.stringify(entry) + '\n'
    await writeFile(logPath, line, { flag: 'a' })
  } catch (error) {
    log.warn('Failed to write workflow log', { error: String(error) })
  }
}

/**
 * Persiste el run a disco
 */
async function persistRun(run: WorkflowRun): Promise<void> {
  try {
    if (!existsSync(RUNS_DIR)) {
      await mkdir(RUNS_DIR, { recursive: true })
    }

    const runPath = join(RUNS_DIR, `${run.id}.json`)
    await writeFile(runPath, JSON.stringify(run, null, 2))
    log.debug('Persisted workflow run', { runId: run.id })
  } catch (error) {
    log.warn('Failed to persist workflow run', { error: String(error) })
  }
}

/**
 * Obtiene el estado de un workflow run
 */
export function getWorkflowRun(runId: string): WorkflowRun | undefined {
  return activeRuns.get(runId)
}

/**
 * Lista todos los workflow runs activos
 */
export function getActiveRuns(): WorkflowRun[] {
  return Array.from(activeRuns.values())
}

/**
 * Pausa un workflow run
 */
export function pauseWorkflow(runId: string): boolean {
  const run = activeRuns.get(runId)
  if (run && run.status === 'running') {
    run.status = 'paused'
    emitEvent({
      type: 'workflow_paused',
      runId,
      timestamp: new Date(),
    })
    return true
  }
  return false
}

/**
 * Reanuda un workflow pausado
 */
export async function resumeWorkflow(runId: string): Promise<boolean> {
  const run = activeRuns.get(runId)
  if (run && run.status === 'paused') {
    run.status = 'running'
    const definition = workflowCache.get(run.workflowId)
    if (definition) {
      executeWorkflow(run).catch(error => {
        log.error('Workflow resume failed', { runId, error: String(error) })
      })
      return true
    }
  }
  return false
}

/**
 * Cancela un workflow run
 */
export function cancelWorkflow(runId: string): boolean {
  const run = activeRuns.get(runId)
  if (run) {
    run.status = 'failed'
    run.error = 'Cancelled by user'
    run.completedAt = new Date()
    activeRuns.delete(runId)
    return true
  }
  return false
}

/**
 * Detecta qué workflow debería ejecutarse para un prompt
 */
export async function detectWorkflow(
  prompt: string,
  complexity: number
): Promise<WorkflowDefinition | null> {
  const definitions = workflowCache.size > 0
    ? Array.from(workflowCache.values())
    : await loadWorkflowDefinitions()

  const promptLower = prompt.toLowerCase()

  for (const def of definitions) {
    // Check complexity
    if (def.triggers.complexity && complexity < def.triggers.complexity) {
      continue
    }

    // Check keywords
    const hasKeyword = def.triggers.keywords.some(kw =>
      promptLower.includes(kw.toLowerCase())
    )

    if (hasKeyword) {
      return def
    }
  }

  return null
}

// Initialize on load
loadWorkflowDefinitions().catch(error => {
  log.warn('Failed to load workflows on init', { error: String(error) })
})

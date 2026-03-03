import { EventEmitter } from 'events'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { logger } from '../logger'
import type {
  BlueprintDefinition,
  BlueprintNode,
  BlueprintRun,
  BlueprintEvent,
} from '@shared/types/blueprint'
import { loadBlueprintsFromDir } from './blueprint-parser'
import { topologicalSort } from './blueprint-executor-helpers'
import { executeNodeWithRetry } from './blueprint-node-executor'

const log = logger.child('blueprint-executor')

let agentSpawner: {
  spawn: (config: Record<string, unknown>) => Promise<{ output: string; success: boolean }>
} | null = null
const blueprintCache = new Map<string, BlueprintDefinition>()
const activeRuns = new Map<string, BlueprintRun>()
const emitter = new EventEmitter()

const BLUEPRINTS_DIR = join(process.cwd(), '..', '..', '.claude', 'blueprints')
const RUNS_DIR = join(process.cwd(), '..', 'data', 'blueprint-runs')

export function setAgentSpawner(spawner: typeof agentSpawner): void {
  agentSpawner = spawner
}

export function onBlueprintEvent(handler: (event: BlueprintEvent) => void): void {
  emitter.on('event', handler)
}

function emitBlueprintEvent(event: BlueprintEvent): void {
  try {
    emitter.emit('event', event)
  } catch (error) {
    log.warn('Blueprint event handler error', { error: String(error) })
  }
}

export async function loadBlueprints(): Promise<BlueprintDefinition[]> {
  const definitions = await loadBlueprintsFromDir(BLUEPRINTS_DIR)
  for (const def of definitions) {
    blueprintCache.set(def.id, def)
  }
  return definitions
}

export function detectBlueprint(
  prompt: string,
  complexity: number | undefined
): BlueprintDefinition | null {
  const promptLower = prompt.toLowerCase()
  const definitions = Array.from(blueprintCache.values())

  for (const def of definitions) {
    if (!matchesKeywords(def, promptLower)) continue
    if (!matchesComplexity(def, complexity)) continue
    return def
  }

  return null
}

function matchesKeywords(def: BlueprintDefinition, promptLower: string): boolean {
  return def.triggers.keywords.some((kw) => promptLower.includes(kw.toLowerCase()))
}

function matchesComplexity(def: BlueprintDefinition, complexity: number | undefined): boolean {
  const range = def.triggers.complexity
  if (!range) return true
  if (complexity === undefined) return true
  if (range.min !== undefined && complexity < range.min) return false
  if (range.max !== undefined && complexity > range.max) return false
  return true
}

export async function startBlueprint(
  blueprintId: string,
  variables: Record<string, string>,
  sessionId: string,
  workDir: string | undefined
): Promise<BlueprintRun> {
  const definition = blueprintCache.get(blueprintId)
  if (!definition) throw new Error(`Blueprint not found: ${blueprintId}`)

  const mergedVars = { ...definition.variables, ...variables }

  const run: BlueprintRun = {
    id: crypto.randomUUID(),
    blueprintId: definition.id,
    blueprintName: definition.name,
    status: 'running',
    startedAt: new Date().toISOString(),
    nodeRuns: [],
    variables: mergedVars,
    context: {},
  }

  activeRuns.set(run.id, run)
  emitBlueprintEvent({ type: 'blueprint_started', runId: run.id, timestamp: run.startedAt })

  executeBlueprint(run, sessionId, workDir).catch((error) => {
    log.error('Blueprint execution failed', { runId: run.id, error: String(error) })
  })

  return run
}

export async function executeBlueprint(
  run: BlueprintRun,
  sessionId: string,
  workDir: string | undefined
): Promise<BlueprintRun> {
  const definition = blueprintCache.get(run.blueprintId)
  if (!definition) {
    run.status = 'failed'
    return run
  }

  try {
    const groups = topologicalSort(definition.nodes)
    await executeGroups(groups, definition, run, sessionId, workDir)
  } catch (error) {
    run.status = 'failed'
    log.error('Blueprint DAG error', { runId: run.id, error: String(error) })
  }

  finalizeBlueprintRun(run)
  await persistRun(run)
  activeRuns.delete(run.id)

  return run
}

async function executeGroups(
  groups: string[][],
  definition: BlueprintDefinition,
  run: BlueprintRun,
  sessionId: string,
  workDir: string | undefined
): Promise<void> {
  const nodeMap = new Map<string, BlueprintNode>()
  for (const node of definition.nodes) {
    nodeMap.set(node.id, node)
  }

  for (const group of groups) {
    if (run.status !== 'running') break

    const executions = group
      .filter((nodeId) => shouldExecuteNode(nodeId, run))
      .map((nodeId) => {
        const node = nodeMap.get(nodeId)
        if (!node) return Promise.resolve()
        return executeNodeWithRetry(node, run, sessionId, workDir, agentSpawner, emitBlueprintEvent)
      })

    await Promise.allSettled(executions)
  }
}

const SKIP_STATUSES = new Set(['completed', 'skipped'])

function shouldExecuteNode(nodeId: string, run: BlueprintRun): boolean {
  const nodeRun = run.nodeRuns.find((nr) => nr.nodeId === nodeId)
  if (nodeRun) return !SKIP_STATUSES.has(nodeRun.status)
  return true
}

function finalizeBlueprintRun(run: BlueprintRun): void {
  if (run.status === 'running') {
    run.status = 'completed'
  }

  run.completedAt = new Date().toISOString()
  const startMs = new Date(run.startedAt).getTime()
  const endMs = new Date(run.completedAt).getTime()
  run.totalDurationMs = endMs - startMs

  const eventType: BlueprintEvent['type'] =
    run.status === 'completed' ? 'blueprint_completed' : 'blueprint_failed'
  emitBlueprintEvent({ type: eventType, runId: run.id, timestamp: run.completedAt })
}

async function persistRun(run: BlueprintRun): Promise<void> {
  try {
    await mkdir(RUNS_DIR, { recursive: true })
    const runPath = join(RUNS_DIR, `${run.id}.json`)
    await writeFile(runPath, JSON.stringify(run, null, 2))
  } catch (error) {
    log.warn('Failed to persist blueprint run', { error: String(error) })
  }
}

export function getActiveRun(runId: string): BlueprintRun | undefined {
  return activeRuns.get(runId)
}

export function cancelBlueprint(runId: string): boolean {
  const run = activeRuns.get(runId)
  if (!run) return false
  run.status = 'cancelled'
  run.completedAt = new Date().toISOString()
  activeRuns.delete(runId)
  return true
}

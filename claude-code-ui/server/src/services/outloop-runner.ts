import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import type { OutloopRun, OutloopStatus } from '../../../shared/types'
import { loadBlueprints, detectBlueprint } from './blueprint-executor'
import { executeRound } from './outloop-round'
import { logger } from '../logger'

const log = logger.child('outloop-runner')

const MAX_ROUNDS = 2
const activeRuns = new Map<string, OutloopRun>()
const emitter = new EventEmitter()

function isCancelled(run: OutloopRun): boolean {
  return (run as { status: OutloopStatus }).status === 'cancelled'
}

function emitOutloopEvent(type: string, runId: string, data?: unknown): void {
  emitter.emit('event', { type, runId, data })
}

function finalizeRun(run: OutloopRun, status: OutloopStatus, resultOrError: string): void {
  run.status = status
  if (status === 'completed') {
    run.result = resultOrError
  } else {
    run.error = resultOrError
  }
  run.completedAt = new Date().toISOString()
}

export function onOutloopEvent(
  handler: (event: { type: string; runId: string; data?: unknown }) => void
): void {
  emitter.on('event', handler)
}

export function getOutloopRun(runId: string): OutloopRun | undefined {
  return activeRuns.get(runId)
}

export function listOutloopRuns(): OutloopRun[] {
  return Array.from(activeRuns.values())
}

export function cancelOutloopRun(runId: string): boolean {
  const run = activeRuns.get(runId)
  if (!run || run.status === 'completed' || run.status === 'failed') return false
  run.status = 'cancelled'
  run.completedAt = new Date().toISOString()
  emitOutloopEvent('outloop_cancelled', runId)
  return true
}

export async function startOutloop(params: {
  prompt: string
  blueprintId?: string
  workDir?: string
  maxRounds?: number
  sessionId?: string
}): Promise<OutloopRun> {
  const { prompt, blueprintId, workDir, maxRounds, sessionId } = params

  const run: OutloopRun = {
    id: randomUUID(),
    prompt,
    blueprintId,
    status: 'queued',
    currentRound: 0,
    maxRounds: maxRounds || MAX_ROUNDS,
    startedAt: new Date().toISOString(),
    workDir: workDir || process.cwd(),
    rounds: [],
  }

  activeRuns.set(run.id, run)
  emitOutloopEvent('outloop_started', run.id)

  executeOutloop(run, sessionId || 'outloop-' + run.id).catch((err) => {
    finalizeRun(run, 'failed', err instanceof Error ? err.message : String(err))
    emitOutloopEvent('outloop_failed', run.id, { error: run.error })
  })

  return run
}

function resolveBlueprint(run: OutloopRun): string {
  if (run.blueprintId) return run.blueprintId
  const detected = detectBlueprint(run.prompt, undefined)
  return detected?.id || 'dev-cycle'
}

async function executeOutloop(run: OutloopRun, sessionId: string): Promise<void> {
  run.status = 'running'
  await loadBlueprints()
  const blueprintId = resolveBlueprint(run)

  for (let round = 1; round <= run.maxRounds; round++) {
    if (isCancelled(run)) return

    run.currentRound = round
    if (round > 1) run.status = 'retrying'

    const roundResult = await executeRound(run, round, blueprintId, sessionId)
    run.rounds.push(roundResult)
    emitOutloopEvent('outloop_round_completed', run.id, {
      round,
      passed: roundResult.status === 'passed',
    })

    if (roundResult.status === 'passed') {
      finalizeRun(run, 'completed', roundResult.output || 'All checks passed')
      emitOutloopEvent('outloop_completed', run.id)
      await persistOutloopRun(run)
      return
    }
  }

  finalizeRun(run, 'failed', `Failed after ${run.maxRounds} rounds`)
  emitOutloopEvent('outloop_failed', run.id, { error: run.error })
  await persistOutloopRun(run)
}

async function persistOutloopRun(run: OutloopRun): Promise<void> {
  try {
    const dir = join(process.cwd(), '..', 'data', 'outloop-runs')
    await mkdir(dir, { recursive: true })
    await Bun.write(join(dir, `${run.id}.json`), JSON.stringify(run, null, 2))
  } catch (err) {
    log.warn('Failed to persist outloop run', { error: String(err) })
  }
}

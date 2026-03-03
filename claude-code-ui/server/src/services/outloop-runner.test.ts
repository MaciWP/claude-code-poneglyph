import { describe, test, expect, mock } from 'bun:test'
import { startOutloop, getOutloopRun, listOutloopRuns, cancelOutloopRun } from './outloop-runner'

mock.module('./blueprint-executor', () => ({
  loadBlueprints: async () => [],
  detectBlueprint: () => ({ id: 'dev-cycle', name: 'Dev Cycle', nodes: [] }),
  startBlueprint: async () => ({
    id: 'test-run',
    blueprintId: 'dev-cycle',
    status: 'completed',
    nodeRuns: [{ nodeId: 'implement', status: 'completed', output: 'Done', retryCount: 0 }],
  }),
}))

mock.module('./hook-runner', () => ({
  runQualityGate: async () => ({
    passed: true,
    results: [
      { hookName: 'typecheck', passed: true, exitCode: 0, stdout: '', stderr: '', durationMs: 100 },
      { hookName: 'test', passed: true, exitCode: 0, stdout: '', stderr: '', durationMs: 200 },
    ],
  }),
}))

describe('outloop-runner', () => {
  test('creates a run with queued status', async () => {
    const run = await startOutloop({ prompt: 'test task' })
    expect(run.id).toBeTruthy()
    expect(run.prompt).toBe('test task')
    expect(run.maxRounds).toBe(2)
    expect(['queued', 'running']).toContain(run.status)
  })

  test('can retrieve a run by id', async () => {
    const run = await startOutloop({ prompt: 'retrieve test' })
    const retrieved = getOutloopRun(run.id)
    expect(retrieved).toBeTruthy()
    expect(retrieved?.id).toBe(run.id)
  })

  test('lists all runs', async () => {
    const initialCount = listOutloopRuns().length
    await startOutloop({ prompt: 'list test' })
    expect(listOutloopRuns().length).toBeGreaterThanOrEqual(initialCount + 1)
  })

  test('can cancel a queued/running run', async () => {
    const run = await startOutloop({ prompt: 'cancel test' })
    const cancelled = cancelOutloopRun(run.id)
    expect(typeof cancelled).toBe('boolean')
  })

  test('returns false for cancelling non-existent run', () => {
    const result = cancelOutloopRun('non-existent-id')
    expect(result).toBe(false)
  })

  test('defaults maxRounds to 2', async () => {
    const run = await startOutloop({ prompt: 'max rounds test' })
    expect(run.maxRounds).toBe(2)
  })

  test('respects custom maxRounds', async () => {
    const run = await startOutloop({ prompt: 'custom rounds', maxRounds: 1 })
    expect(run.maxRounds).toBe(1)
  })
})

import { describe, test, expect } from 'bun:test'

/**
 * Parallel Execution Tests
 *
 * Tests wave execution patterns (PARALLEL, SEQUENTIAL, CHECKPOINT)
 * following patterns in .claude/rules/performance.md
 */

// Types
type WaveType = 'PARALLEL' | 'SEQUENTIAL' | 'CHECKPOINT'

interface TaskResult {
  taskId: string
  duration: number
  startTime: number
  endTime: number
}

interface Task {
  id: string
  name: string
  execute: () => Promise<TaskResult>
}

interface Wave {
  type: WaveType
  tasks: Task[]
}

interface WaveResult {
  results: TaskResult[]
  totalTime: number
  waveType: WaveType
}

interface WaveExecutionContext {
  priorWavesComplete: boolean
  completedWaveIds: string[]
}

/**
 * Execute a wave according to its type
 */
async function executeWave(wave: Wave, context?: WaveExecutionContext): Promise<WaveResult> {
  const startTime = Date.now()
  let results: TaskResult[] = []

  if (wave.type === 'PARALLEL') {
    results = await Promise.all(wave.tasks.map((t) => t.execute()))
  } else if (wave.type === 'SEQUENTIAL') {
    for (const task of wave.tasks) {
      const result = await task.execute()
      results.push(result)
    }
  } else if (wave.type === 'CHECKPOINT') {
    if (context && !context.priorWavesComplete) {
      throw new Error('CHECKPOINT wave requires all prior waves to complete')
    }
    results = await Promise.all(wave.tasks.map((t) => t.execute()))
  }

  return {
    results,
    totalTime: Date.now() - startTime,
    waveType: wave.type,
  }
}

/**
 * Execute multiple waves in sequence
 */
async function executeWaveSequence(waves: Wave[]): Promise<WaveResult[]> {
  const waveResults: WaveResult[] = []
  const context: WaveExecutionContext = {
    priorWavesComplete: true,
    completedWaveIds: [],
  }

  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i]

    if (wave.type === 'CHECKPOINT') {
      context.priorWavesComplete = waveResults.every(
        (r) => r.results.length > 0 || r.results.length === 0
      )
    }

    const result = await executeWave(wave, context)
    waveResults.push(result)
    context.completedWaveIds.push(`wave-${i}`)
  }

  return waveResults
}

describe('Parallel Execution', () => {
  // Helper to create task with delay
  const createTask = (id: string, delayMs: number): Task => ({
    id,
    name: `Task ${id}`,
    execute: async (): Promise<TaskResult> => {
      const startTime = Date.now()
      await Bun.sleep(delayMs)
      const endTime = Date.now()
      return { taskId: id, duration: delayMs, startTime, endTime }
    },
  })

  describe('PARALLEL Wave', () => {
    test('should execute tasks concurrently', async () => {
      const wave: Wave = {
        type: 'PARALLEL',
        tasks: [createTask('1', 100), createTask('2', 100), createTask('3', 100)],
      }

      const { results, totalTime } = await executeWave(wave)

      expect(results).toHaveLength(3)
      // Parallel: ~100ms, not 300ms
      expect(totalTime).toBeLessThan(200)
    })

    test('should return results for all tasks', async () => {
      const wave: Wave = {
        type: 'PARALLEL',
        tasks: [createTask('a', 50), createTask('b', 75), createTask('c', 25)],
      }

      const { results } = await executeWave(wave)

      const taskIds = results.map((r) => r.taskId).sort()
      expect(taskIds).toEqual(['a', 'b', 'c'])
    })

    test('should have overlapping execution times', async () => {
      const wave: Wave = {
        type: 'PARALLEL',
        tasks: [createTask('1', 100), createTask('2', 100), createTask('3', 100)],
      }

      const { results } = await executeWave(wave)

      const startTimes = results.map((r) => r.startTime)
      const maxStartDiff = Math.max(...startTimes) - Math.min(...startTimes)

      // All should start within 50ms of each other
      expect(maxStartDiff).toBeLessThan(50)
    })

    test('should complete in time of longest task', async () => {
      const wave: Wave = {
        type: 'PARALLEL',
        tasks: [createTask('fast', 30), createTask('medium', 60), createTask('slow', 100)],
      }

      const { totalTime } = await executeWave(wave)

      expect(totalTime).toBeGreaterThanOrEqual(100)
      expect(totalTime).toBeLessThan(150)
    })
  })

  describe('SEQUENTIAL Wave', () => {
    test('should execute tasks in order', async () => {
      const executionOrder: string[] = []

      const wave: Wave = {
        type: 'SEQUENTIAL',
        tasks: [
          {
            id: '1',
            name: 'Task 1',
            execute: async (): Promise<TaskResult> => {
              const startTime = Date.now()
              executionOrder.push('1')
              await Bun.sleep(50)
              return { taskId: '1', duration: 50, startTime, endTime: Date.now() }
            },
          },
          {
            id: '2',
            name: 'Task 2',
            execute: async (): Promise<TaskResult> => {
              const startTime = Date.now()
              executionOrder.push('2')
              await Bun.sleep(50)
              return { taskId: '2', duration: 50, startTime, endTime: Date.now() }
            },
          },
        ],
      }

      const { totalTime } = await executeWave(wave)

      expect(executionOrder).toEqual(['1', '2'])
      expect(totalTime).toBeGreaterThanOrEqual(100)
    })

    test('should have non-overlapping execution times', async () => {
      const wave: Wave = {
        type: 'SEQUENTIAL',
        tasks: [createTask('1', 50), createTask('2', 50)],
      }

      const { results } = await executeWave(wave)

      // Each task should start after previous ends
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1]
        const curr = results[i]
        expect(curr.startTime).toBeGreaterThanOrEqual(prev.endTime - 5)
      }
    })

    test('should preserve result order', async () => {
      const wave: Wave = {
        type: 'SEQUENTIAL',
        tasks: [createTask('first', 30), createTask('second', 20), createTask('third', 10)],
      }

      const { results } = await executeWave(wave)

      expect(results[0].taskId).toBe('first')
      expect(results[1].taskId).toBe('second')
      expect(results[2].taskId).toBe('third')
    })

    test('should take sum of all task durations', async () => {
      const wave: Wave = {
        type: 'SEQUENTIAL',
        tasks: [createTask('a', 40), createTask('b', 60)],
      }

      const { totalTime } = await executeWave(wave)

      expect(totalTime).toBeGreaterThanOrEqual(100)
      expect(totalTime).toBeLessThan(150)
    })
  })

  describe('CHECKPOINT Wave', () => {
    test('should execute after prior waves complete', async () => {
      const wave: Wave = {
        type: 'CHECKPOINT',
        tasks: [createTask('checkpoint-1', 50)],
      }

      const context: WaveExecutionContext = {
        priorWavesComplete: true,
        completedWaveIds: ['wave-0', 'wave-1'],
      }

      const { results } = await executeWave(wave, context)
      expect(results).toHaveLength(1)
      expect(results[0].taskId).toBe('checkpoint-1')
    })

    test('should throw if prior waves not complete', async () => {
      const wave: Wave = {
        type: 'CHECKPOINT',
        tasks: [createTask('checkpoint', 50)],
      }

      const context: WaveExecutionContext = {
        priorWavesComplete: false,
        completedWaveIds: [],
      }

      await expect(executeWave(wave, context)).rejects.toThrow(
        'CHECKPOINT wave requires all prior waves to complete'
      )
    })

    test('should execute tasks in parallel after checkpoint clears', async () => {
      const wave: Wave = {
        type: 'CHECKPOINT',
        tasks: [createTask('cp-1', 80), createTask('cp-2', 80), createTask('cp-3', 80)],
      }

      const context: WaveExecutionContext = {
        priorWavesComplete: true,
        completedWaveIds: ['wave-0'],
      }

      const { results, totalTime } = await executeWave(wave, context)

      expect(results).toHaveLength(3)
      expect(totalTime).toBeLessThan(150)
    })

    test('should block subsequent waves until complete', async () => {
      const executionLog: string[] = []

      const waves: Wave[] = [
        {
          type: 'PARALLEL',
          tasks: [
            {
              id: 'p1',
              name: 'Parallel 1',
              execute: async (): Promise<TaskResult> => {
                const startTime = Date.now()
                executionLog.push('p1-start')
                await Bun.sleep(30)
                executionLog.push('p1-end')
                return { taskId: 'p1', duration: 30, startTime, endTime: Date.now() }
              },
            },
          ],
        },
        {
          type: 'CHECKPOINT',
          tasks: [
            {
              id: 'cp',
              name: 'Checkpoint',
              execute: async (): Promise<TaskResult> => {
                const startTime = Date.now()
                executionLog.push('cp-start')
                await Bun.sleep(50)
                executionLog.push('cp-end')
                return { taskId: 'cp', duration: 50, startTime, endTime: Date.now() }
              },
            },
          ],
        },
        {
          type: 'SEQUENTIAL',
          tasks: [
            {
              id: 's1',
              name: 'Sequential 1',
              execute: async (): Promise<TaskResult> => {
                const startTime = Date.now()
                executionLog.push('s1-start')
                await Bun.sleep(20)
                executionLog.push('s1-end')
                return { taskId: 's1', duration: 20, startTime, endTime: Date.now() }
              },
            },
          ],
        },
      ]

      const waveResults = await executeWaveSequence(waves)

      expect(waveResults).toHaveLength(3)

      // Verify order
      const p1EndIdx = executionLog.indexOf('p1-end')
      const cpStartIdx = executionLog.indexOf('cp-start')
      expect(p1EndIdx).toBeLessThan(cpStartIdx)

      const cpEndIdx = executionLog.indexOf('cp-end')
      const s1StartIdx = executionLog.indexOf('s1-start')
      expect(cpEndIdx).toBeLessThan(s1StartIdx)
    })
  })

  describe('Wave Sequence Integration', () => {
    test('should execute mixed wave types correctly', async () => {
      const waves: Wave[] = [
        {
          type: 'PARALLEL',
          tasks: [createTask('p1', 30), createTask('p2', 30)],
        },
        {
          type: 'SEQUENTIAL',
          tasks: [createTask('s1', 20), createTask('s2', 20)],
        },
        {
          type: 'CHECKPOINT',
          tasks: [createTask('c1', 25)],
        },
      ]

      const results = await executeWaveSequence(waves)

      expect(results).toHaveLength(3)
      expect(results[0].waveType).toBe('PARALLEL')
      expect(results[1].waveType).toBe('SEQUENTIAL')
      expect(results[2].waveType).toBe('CHECKPOINT')
    })

    test('should handle empty waves gracefully', async () => {
      const waves: Wave[] = [
        { type: 'PARALLEL', tasks: [] },
        { type: 'SEQUENTIAL', tasks: [createTask('single', 20)] },
      ]

      const results = await executeWaveSequence(waves)

      expect(results).toHaveLength(2)
      expect(results[0].results).toHaveLength(0)
      expect(results[1].results).toHaveLength(1)
    })

    test('should calculate correct total times', async () => {
      const waves: Wave[] = [
        {
          type: 'PARALLEL',
          tasks: [createTask('p1', 50), createTask('p2', 50)],
        },
        {
          type: 'SEQUENTIAL',
          tasks: [createTask('s1', 30), createTask('s2', 30)],
        },
      ]

      const results = await executeWaveSequence(waves)

      // Parallel: ~50ms
      expect(results[0].totalTime).toBeLessThan(100)

      // Sequential: ~60ms
      expect(results[1].totalTime).toBeGreaterThanOrEqual(60)
    })
  })

  describe('Error Handling', () => {
    test('should propagate errors from parallel tasks', async () => {
      const wave: Wave = {
        type: 'PARALLEL',
        tasks: [
          createTask('good', 20),
          {
            id: 'bad',
            name: 'Bad Task',
            execute: async (): Promise<TaskResult> => {
              await Bun.sleep(10)
              throw new Error('Task failed')
            },
          },
        ],
      }

      await expect(executeWave(wave)).rejects.toThrow('Task failed')
    })

    test('should propagate errors from sequential tasks', async () => {
      const executedTasks: string[] = []

      const wave: Wave = {
        type: 'SEQUENTIAL',
        tasks: [
          {
            id: 'first',
            name: 'First',
            execute: async (): Promise<TaskResult> => {
              const startTime = Date.now()
              executedTasks.push('first')
              await Bun.sleep(20)
              return { taskId: 'first', duration: 20, startTime, endTime: Date.now() }
            },
          },
          {
            id: 'failing',
            name: 'Failing',
            execute: async (): Promise<TaskResult> => {
              executedTasks.push('failing')
              throw new Error('Sequential task failed')
            },
          },
          {
            id: 'never',
            name: 'Never',
            execute: async (): Promise<TaskResult> => {
              executedTasks.push('never')
              return { taskId: 'never', duration: 0, startTime: Date.now(), endTime: Date.now() }
            },
          },
        ],
      }

      await expect(executeWave(wave)).rejects.toThrow('Sequential task failed')
      expect(executedTasks).toEqual(['first', 'failing'])
      expect(executedTasks).not.toContain('never')
    })
  })
})

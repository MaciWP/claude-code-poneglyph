import { useState, useCallback, useEffect, useRef } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface QAStepResult {
  index: number
  action: string
  target: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  screenshotPath?: string
  error?: string
  durationMs?: number
}

export interface QAResult {
  id: string
  storyName: string
  status: 'running' | 'passed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt?: string
  steps: QAStepResult[]
  screenshots: string[]
  summary?: string
  error?: string
}

export interface UseQADashboardReturn {
  stories: string[]
  results: QAResult[]
  activeRun: QAResult | null
  isLoading: boolean
  error: string | null
  isRunning: boolean
  runStory: (storyName: string) => Promise<void>
  cancelRun: (id: string) => Promise<void>
  refresh: () => void
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ACTIVE_POLL_MS = 2000
const IDLE_POLL_MS = 30000

// =============================================================================
// API HELPERS
// =============================================================================

async function fetchQAStories(): Promise<string[]> {
  const response = await fetch('/api/qa/stories')
  if (!response.ok) throw new Error('Failed to fetch QA stories')
  return response.json()
}

async function fetchQAResults(): Promise<QAResult[]> {
  const response = await fetch('/api/qa/results')
  if (!response.ok) throw new Error('Failed to fetch QA results')
  return response.json()
}

async function postRunStory(storyName: string): Promise<void> {
  const response = await fetch('/api/qa/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyName }),
  })
  if (!response.ok) throw new Error('Failed to start QA run')
}

async function postCancelRun(id: string): Promise<void> {
  const response = await fetch(`/api/qa/results/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Failed to cancel QA run')
}

// =============================================================================
// HOOK
// =============================================================================

export function useQADashboard(): UseQADashboardReturn {
  const [stories, setStories] = useState<string[]>([])
  const [results, setResults] = useState<QAResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeRun = results.find((r) => r.status === 'running') ?? null
  const isRunning = activeRun !== null

  const fetchAll = useCallback(async () => {
    try {
      const [storiesData, resultsData] = await Promise.all([fetchQAStories(), fetchQAResults()])
      if (mountedRef.current) {
        setStories(storiesData)
        setResults(resultsData)
        setError(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const setupPolling = useCallback(
    (intervalMs: number) => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      pollIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          fetchAll()
        }
      }, intervalMs)
    },
    [fetchAll]
  )

  // Initial load
  useEffect(() => {
    mountedRef.current = true
    fetchAll()
    return () => {
      mountedRef.current = false
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [fetchAll])

  // Adjust polling interval based on active run
  useEffect(() => {
    const interval = isRunning ? ACTIVE_POLL_MS : IDLE_POLL_MS
    setupPolling(interval)
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [isRunning, setupPolling])

  const runStory = useCallback(
    async (storyName: string) => {
      try {
        setError(null)
        await postRunStory(storyName)
        await fetchAll()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to run story'
        setError(message)
      }
    },
    [fetchAll]
  )

  const cancelRun = useCallback(
    async (id: string) => {
      try {
        setError(null)
        await postCancelRun(id)
        await fetchAll()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel run'
        setError(message)
      }
    },
    [fetchAll]
  )

  const refresh = useCallback(() => {
    fetchAll()
  }, [fetchAll])

  return {
    stories,
    results,
    activeRun,
    isLoading,
    error,
    isRunning,
    runStory,
    cancelRun,
    refresh,
  }
}

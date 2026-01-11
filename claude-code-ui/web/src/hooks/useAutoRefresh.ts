import { useEffect, useRef, useCallback } from 'react'

interface UseAutoRefreshOptions {
  enabled: boolean
  intervalMs: number
  immediate?: boolean
}

export function useAutoRefresh(
  callback: () => Promise<void> | void,
  deps: React.DependencyList,
  options: UseAutoRefreshOptions
) {
  const { enabled, intervalMs, immediate = true } = options
  const callbackRef = useRef(callback)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const execute = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      await callbackRef.current()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('useAutoRefresh callback error:', error)
    }
  }, [])

  useEffect(() => {
    if (immediate) {
      execute()
    }

    let interval: ReturnType<typeof setInterval> | undefined

    if (enabled) {
      interval = setInterval(execute, intervalMs)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, execute, ...deps])

  return {
    refresh: execute,
    abort: useCallback(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }, [])
  }
}

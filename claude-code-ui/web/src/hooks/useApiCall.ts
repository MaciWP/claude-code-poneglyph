import { useState, useEffect, useCallback, useRef } from 'react'
import { APIError, NetworkError, AbortedError, type AppError } from '../lib/errors'

export interface UseApiCallOptions<T> {
  immediate?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: AppError) => void
  defaultValue?: T
}

export interface UseApiCallResult<T> {
  data: T | null
  error: AppError | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  refetch: () => Promise<void>
  reset: () => void
}

export function useApiCall<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: UseApiCallOptions<T> = {}
): UseApiCallResult<T> {
  const { immediate = true, onSuccess, onError, defaultValue } = options

  const [data, setData] = useState<T | null>(defaultValue ?? null)
  const [error, setError] = useState<AppError | null>(null)
  const [isLoading, setIsLoading] = useState(immediate)

  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const execute = useCallback(async (): Promise<void> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetcher(signal)

      if (!mountedRef.current) return

      setData(result)
      setIsLoading(false)
      onSuccess?.(result)
    } catch (err) {
      if (!mountedRef.current) return

      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      const appError = normalizeError(err)
      setError(appError)
      setIsLoading(false)
      onError?.(appError)
    }
  }, [fetcher, onSuccess, onError])

  const reset = useCallback((): void => {
    setData(defaultValue ?? null)
    setError(null)
    setIsLoading(false)
  }, [defaultValue])

  useEffect(() => {
    mountedRef.current = true

    if (immediate) {
      execute()
    }

    return () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [immediate, execute])

  return {
    data,
    error,
    isLoading,
    isSuccess: !isLoading && !error && data !== null,
    isError: !isLoading && error !== null,
    refetch: execute,
    reset,
  }
}

function normalizeError(error: unknown): AppError {
  if (error instanceof APIError) return error
  if (error instanceof NetworkError) return error
  if (error instanceof AbortedError) return error

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError('Failed to connect to server')
  }

  if (error instanceof Error) {
    return new APIError(0, 'unknown', error.message)
  }

  return new APIError(0, 'unknown', 'An unexpected error occurred')
}

export interface UseMutationOptions<T, V> {
  onSuccess?: (data: T, variables: V) => void
  onError?: (error: AppError, variables: V) => void
}

export interface UseMutationResult<T, V> {
  data: T | null
  error: AppError | null
  isLoading: boolean
  mutate: (variables: V) => Promise<T | null>
  reset: () => void
}

export function useMutation<T, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  options: UseMutationOptions<T, V> = {}
): UseMutationResult<T, V> {
  const { onSuccess, onError } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const mutate = useCallback(
    async (variables: V): Promise<T | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await mutationFn(variables)
        setData(result)
        setIsLoading(false)
        onSuccess?.(result, variables)
        return result
      } catch (err) {
        const appError = normalizeError(err)
        setError(appError)
        setIsLoading(false)
        onError?.(appError, variables)
        return null
      }
    },
    [mutationFn, onSuccess, onError]
  )

  const reset = useCallback((): void => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    data,
    error,
    isLoading,
    mutate,
    reset,
  }
}

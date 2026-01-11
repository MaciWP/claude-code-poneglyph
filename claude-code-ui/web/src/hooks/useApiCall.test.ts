import { describe, test, expect, mock } from 'bun:test'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useApiCall, useMutation } from './useApiCall'
import { APIError } from '../lib/errors'

describe('useApiCall', () => {
  test('fetches data immediately by default', async () => {
    const mockData = { id: 1, name: 'Test' }
    const fetcher = mock(() => Promise.resolve(mockData))

    const { result } = renderHook(() => useApiCall(fetcher))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.error).toBe(null)
  })

  test('does not fetch immediately when immediate is false', async () => {
    const fetcher = mock(() => Promise.resolve({ id: 1 }))

    const { result } = renderHook(() =>
      useApiCall(fetcher, { immediate: false })
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBe(null)
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('handles errors correctly', async () => {
    const error = new APIError(404, '/api/test', 'Not Found')
    const fetcher = mock(() => Promise.reject(error))

    const { result } = renderHook(() => useApiCall(fetcher))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeInstanceOf(APIError)
    expect(result.current.isError).toBe(true)
    expect(result.current.data).toBe(null)
  })

  test('calls onSuccess callback', async () => {
    const mockData = { id: 1 }
    const onSuccess = mock(() => {})
    const fetcher = mock(() => Promise.resolve(mockData))

    renderHook(() => useApiCall(fetcher, { onSuccess }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData)
    })
  })

  test('calls onError callback', async () => {
    const error = new APIError(500, '/api', 'Error')
    const onError = mock(() => {})
    const fetcher = mock(() => Promise.reject(error))

    renderHook(() => useApiCall(fetcher, { onError }))

    await waitFor(() => {
      expect(onError).toHaveBeenCalled()
    })
  })

  test('refetch works correctly', async () => {
    let callCount = 0
    const fetcher = mock(() => Promise.resolve({ count: ++callCount }))

    const { result } = renderHook(() => useApiCall(fetcher))

    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 1 })
    })

    await act(async () => {
      await result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 2 })
    })
  })

  test('reset clears state', async () => {
    const fetcher = mock(() => Promise.resolve({ id: 1 }))

    const { result } = renderHook(() => useApiCall(fetcher))

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 1 })
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(null)
    expect(result.current.isLoading).toBe(false)
  })

  test('uses defaultValue', async () => {
    const fetcher = mock(() => Promise.resolve({ id: 1 }))
    const defaultValue = { id: 0 }

    const { result } = renderHook(() =>
      useApiCall(fetcher, { immediate: false, defaultValue })
    )

    expect(result.current.data).toEqual(defaultValue)
  })
})

describe('useMutation', () => {
  test('mutate executes function with variables', async () => {
    const mockResult = { success: true }
    const mutationFn = mock((_vars: { id: number }) => Promise.resolve(mockResult))

    const { result } = renderHook(() => useMutation(mutationFn))

    expect(result.current.isLoading).toBe(false)

    let mutationResult: typeof mockResult | null = null
    await act(async () => {
      mutationResult = await result.current.mutate({ id: 1 })
    })

    expect(mutationResult).toEqual(mockResult)
    expect(result.current.data).toEqual(mockResult)
    expect(mutationFn).toHaveBeenCalledWith({ id: 1 })
  })

  test('handles mutation errors', async () => {
    const error = new APIError(400, '/api', 'Bad Request')
    const mutationFn = mock(() => Promise.reject(error))

    const { result } = renderHook(() => useMutation(mutationFn))

    await act(async () => {
      await result.current.mutate(undefined)
    })

    expect(result.current.error).toBeInstanceOf(APIError)
    expect(result.current.data).toBe(null)
  })

  test('calls onSuccess with data and variables', async () => {
    const mockResult = { id: 1 }
    const onSuccess = mock(() => {})
    const mutationFn = mock(() => Promise.resolve(mockResult))

    const { result } = renderHook(() =>
      useMutation(mutationFn, { onSuccess })
    )

    await act(async () => {
      await result.current.mutate({ name: 'test' })
    })

    expect(onSuccess).toHaveBeenCalledWith(mockResult, { name: 'test' })
  })

  test('calls onError with error and variables', async () => {
    const error = new APIError(500, '/api', 'Error')
    const onError = mock(() => {})
    const mutationFn = mock(() => Promise.reject(error))

    const { result } = renderHook(() =>
      useMutation(mutationFn, { onError })
    )

    await act(async () => {
      await result.current.mutate({ id: 1 })
    })

    expect(onError).toHaveBeenCalled()
  })

  test('reset clears mutation state', async () => {
    const mutationFn = mock(() => Promise.resolve({ id: 1 }))

    const { result } = renderHook(() => useMutation(mutationFn))

    await act(async () => {
      await result.current.mutate(undefined)
    })

    expect(result.current.data).toEqual({ id: 1 })

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(null)
  })
})

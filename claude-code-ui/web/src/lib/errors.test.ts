import { describe, test, expect } from 'bun:test'
import {
  APIError,
  NetworkError,
  TimeoutError,
  AbortedError,
  isAppError,
  getErrorMessage,
} from './errors'

describe('APIError', () => {
  test('creates error with status and endpoint', () => {
    const error = new APIError(404, '/api/users', 'Not Found')

    expect(error.status).toBe(404)
    expect(error.endpoint).toBe('/api/users')
    expect(error.originalMessage).toBe('Not Found')
    expect(error.name).toBe('APIError')
  })

  test('isNotFound returns true for 404', () => {
    const error = new APIError(404, '/api/users', 'Not Found')
    expect(error.isNotFound).toBe(true)
  })

  test('isUnauthorized returns true for 401', () => {
    const error = new APIError(401, '/api/users', 'Unauthorized')
    expect(error.isUnauthorized).toBe(true)
  })

  test('isServerError returns true for 5xx', () => {
    const error500 = new APIError(500, '/api', 'Server Error')
    const error503 = new APIError(503, '/api', 'Unavailable')

    expect(error500.isServerError).toBe(true)
    expect(error503.isServerError).toBe(true)
  })

  test('isClientError returns true for 4xx', () => {
    const error400 = new APIError(400, '/api', 'Bad Request')
    const error403 = new APIError(403, '/api', 'Forbidden')

    expect(error400.isClientError).toBe(true)
    expect(error403.isClientError).toBe(true)
  })

  test('toUserMessage returns appropriate messages', () => {
    expect(new APIError(404, '/api', '').toUserMessage()).toBe('Resource not found')
    expect(new APIError(401, '/api', '').toUserMessage()).toBe('Authentication required')
    expect(new APIError(500, '/api', '').toUserMessage()).toBe('Server error. Please try again.')
    expect(new APIError(400, '/api', 'Invalid email').toUserMessage()).toBe('Invalid email')
  })
})

describe('NetworkError', () => {
  test('creates error with default message', () => {
    const error = new NetworkError()

    expect(error.name).toBe('NetworkError')
    expect(error.message).toBe('Network connection failed')
  })

  test('creates error with custom message', () => {
    const error = new NetworkError('Custom network error')
    expect(error.message).toBe('Custom network error')
  })

  test('toUserMessage returns user-friendly message', () => {
    const error = new NetworkError()
    expect(error.toUserMessage()).toBe('Unable to connect. Check your network.')
  })
})

describe('TimeoutError', () => {
  test('creates error with endpoint and timeout', () => {
    const error = new TimeoutError('/api/slow', 5000)

    expect(error.name).toBe('TimeoutError')
    expect(error.endpoint).toBe('/api/slow')
    expect(error.timeoutMs).toBe(5000)
  })

  test('toUserMessage returns user-friendly message', () => {
    const error = new TimeoutError('/api/slow', 5000)
    expect(error.toUserMessage()).toBe('Request timed out. Please try again.')
  })
})

describe('AbortedError', () => {
  test('creates error with endpoint', () => {
    const error = new AbortedError('/api/cancelled')

    expect(error.name).toBe('AbortedError')
    expect(error.message).toBe('Request to /api/cancelled was aborted')
  })
})

describe('isAppError', () => {
  test('returns true for app errors', () => {
    expect(isAppError(new APIError(404, '/api', ''))).toBe(true)
    expect(isAppError(new NetworkError())).toBe(true)
    expect(isAppError(new TimeoutError('/api', 1000))).toBe(true)
    expect(isAppError(new AbortedError('/api'))).toBe(true)
  })

  test('returns false for non-app errors', () => {
    expect(isAppError(new Error('generic'))).toBe(false)
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
    expect(isAppError('string error')).toBe(false)
  })
})

describe('getErrorMessage', () => {
  test('returns user message for app errors', () => {
    expect(getErrorMessage(new APIError(404, '/api', ''))).toBe('Resource not found')
    expect(getErrorMessage(new NetworkError())).toBe('Unable to connect. Check your network.')
    expect(getErrorMessage(new TimeoutError('/api', 1000))).toBe('Request timed out. Please try again.')
    expect(getErrorMessage(new AbortedError('/api'))).toBe('Request cancelled')
  })

  test('returns message for generic errors', () => {
    expect(getErrorMessage(new Error('Something went wrong'))).toBe('Something went wrong')
  })

  test('returns default message for unknown errors', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred')
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred')
    expect(getErrorMessage(123)).toBe('An unexpected error occurred')
  })
})

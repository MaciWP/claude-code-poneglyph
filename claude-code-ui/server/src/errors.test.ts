import { describe, test, expect } from 'bun:test'
import {
  AppError,
  NotFoundError,
  ValidationError,
  SessionError,
  ClaudeError,
  toErrorResponse,
  getStatusCode,
} from './errors'

describe('Error Classes', () => {
  describe('AppError', () => {
    test('creates error with default values', () => {
      const error = new AppError('Test error')

      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.name).toBe('AppError')
    })

    test('creates error with custom statusCode and code', () => {
      const error = new AppError('Custom error', 418, 'TEAPOT')

      expect(error.statusCode).toBe(418)
      expect(error.code).toBe('TEAPOT')
    })

    test('is instanceof Error', () => {
      const error = new AppError('Test')
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('NotFoundError', () => {
    test('creates error with resource name', () => {
      const error = new NotFoundError('User')

      expect(error.message).toBe('User not found')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.name).toBe('NotFoundError')
    })

    test('creates error with resource and id', () => {
      const error = new NotFoundError('Session', 'abc-123')

      expect(error.message).toBe("Session with id 'abc-123' not found")
    })

    test('is instanceof AppError', () => {
      const error = new NotFoundError('Resource')
      expect(error instanceof AppError).toBe(true)
    })
  })

  describe('ValidationError', () => {
    test('creates error with message', () => {
      const error = new ValidationError('Invalid input')

      expect(error.message).toBe('Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.name).toBe('ValidationError')
    })

    test('includes field errors', () => {
      const error = new ValidationError('Validation failed', {
        email: 'Invalid email format',
        password: 'Too short',
      })

      expect(error.fields).toEqual({
        email: 'Invalid email format',
        password: 'Too short',
      })
    })
  })

  describe('SessionError', () => {
    test('creates error with correct properties', () => {
      const error = new SessionError('Session expired')

      expect(error.message).toBe('Session expired')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('SESSION_ERROR')
      expect(error.name).toBe('SessionError')
    })
  })

  describe('ClaudeError', () => {
    test('creates error with message', () => {
      const error = new ClaudeError('API rate limited')

      expect(error.message).toBe('API rate limited')
      expect(error.statusCode).toBe(502)
      expect(error.code).toBe('CLAUDE_ERROR')
      expect(error.name).toBe('ClaudeError')
    })

    test('includes original error', () => {
      const original = new Error('Network timeout')
      const error = new ClaudeError('Claude request failed', original)

      expect(error.originalError).toBe(original)
    })
  })
})

describe('toErrorResponse()', () => {
  test('converts AppError to response', () => {
    const error = new AppError('Something went wrong', 500, 'INTERNAL')
    const response = toErrorResponse(error)

    expect(response).toEqual({
      error: {
        code: 'INTERNAL',
        message: 'Something went wrong',
      },
    })
  })

  test('converts ValidationError with fields', () => {
    const error = new ValidationError('Bad request', { name: 'Required' })
    const response = toErrorResponse(error)

    expect(response).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bad request',
        fields: { name: 'Required' },
      },
    })
  })

  test('converts regular Error', () => {
    const error = new Error('Standard error')
    const response = toErrorResponse(error)

    expect(response).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Standard error',
      },
    })
  })

  test('converts unknown error', () => {
    const response = toErrorResponse('string error')

    expect(response).toEqual({
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'string error',
      },
    })
  })

  test('handles null/undefined', () => {
    expect(toErrorResponse(null).error.message).toBe('null')
    expect(toErrorResponse(undefined).error.message).toBe('undefined')
  })
})

describe('getStatusCode()', () => {
  test('returns statusCode from AppError', () => {
    expect(getStatusCode(new AppError('', 400))).toBe(400)
    expect(getStatusCode(new NotFoundError('X'))).toBe(404)
    expect(getStatusCode(new ValidationError(''))).toBe(400)
    expect(getStatusCode(new ClaudeError(''))).toBe(502)
  })

  test('returns 500 for regular Error', () => {
    expect(getStatusCode(new Error('test'))).toBe(500)
  })

  test('returns 500 for non-Error values', () => {
    expect(getStatusCode('string')).toBe(500)
    expect(getStatusCode(null)).toBe(500)
    expect(getStatusCode(42)).toBe(500)
  })
})

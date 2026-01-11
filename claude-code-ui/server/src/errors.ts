export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404,
      'NOT_FOUND'
    )
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class SessionError extends AppError {
  constructor(message: string) {
    super(message, 400, 'SESSION_ERROR')
    this.name = 'SessionError'
  }
}

export class ClaudeError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(message, 502, 'CLAUDE_ERROR')
    this.name = 'ClaudeError'
  }
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError && error.fields ? { fields: error.fields } : {}),
      },
    }
  }

  if (error instanceof Error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    }
  }

  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: String(error),
    },
  }
}

export function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode
  }
  return 500
}

export class APIError extends Error {
  readonly name = 'APIError'

  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly originalMessage: string
  ) {
    super(`API Error ${status}: ${originalMessage}`)
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isServerError(): boolean {
    return this.status >= 500
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  toUserMessage(): string {
    if (this.isNotFound) return 'Resource not found'
    if (this.isUnauthorized) return 'Authentication required'
    if (this.isServerError) return 'Server error. Please try again.'
    return this.originalMessage || 'An error occurred'
  }
}

export class NetworkError extends Error {
  readonly name = 'NetworkError'

  constructor(message = 'Network connection failed') {
    super(message)
  }

  toUserMessage(): string {
    return 'Unable to connect. Check your network.'
  }
}

export class TimeoutError extends Error {
  readonly name = 'TimeoutError'

  constructor(
    public readonly endpoint: string,
    public readonly timeoutMs: number
  ) {
    super(`Request to ${endpoint} timed out after ${timeoutMs}ms`)
  }

  toUserMessage(): string {
    return 'Request timed out. Please try again.'
  }
}

export class AbortedError extends Error {
  readonly name = 'AbortedError'

  constructor(endpoint: string) {
    super(`Request to ${endpoint} was aborted`)
  }
}

export type AppError = APIError | NetworkError | TimeoutError | AbortedError

export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof APIError ||
    error instanceof NetworkError ||
    error instanceof TimeoutError ||
    error instanceof AbortedError
  )
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) return error.toUserMessage()
  if (error instanceof NetworkError) return error.toUserMessage()
  if (error instanceof TimeoutError) return error.toUserMessage()
  if (error instanceof AbortedError) return 'Request cancelled'
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}

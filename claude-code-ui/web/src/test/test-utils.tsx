/**
 * Web Test Utilities
 *
 * Shared utilities for React component testing.
 *
 * @example
 * import { render, screen, createMockSession, createMockMessage } from '../test/test-utils'
 *
 * test('renders chat', () => {
 *   const session = createMockSession()
 *   render(<Chat session={session} />)
 *   expect(screen.getByText('Test Session')).toBeInTheDocument()
 * })
 */

import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { Session, Message, StreamChunk } from '../../../shared/types'

// ============================================================================
// Custom Render
// ============================================================================

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const result = render(ui, { container, ...options })

  return {
    ...result,
    cleanup: () => {
      result.unmount()
      container.remove()
    },
  }
}

// Extended Session type that includes UI-specific fields
export interface ExtendedSession extends Session {
  provider?: 'claude' | 'codex' | 'gemini'
  modes?: {
    orchestrate: boolean
    plan: boolean
    bypassPermissions: boolean
  }
}

// ============================================================================
// Session Factories
// ============================================================================

/**
 * Creates a mock session with sensible defaults
 */
export function createMockSession(overrides?: Partial<ExtendedSession>): ExtendedSession {
  const now = new Date().toISOString()
  return {
    id: `session-${crypto.randomUUID().slice(0, 8)}`,
    name: 'Test Session',
    createdAt: now,
    updatedAt: now,
    workDir: '/test/work/dir',
    messages: [],
    provider: 'claude',
    modes: {
      orchestrate: false,
      plan: false,
      bypassPermissions: true,
    },
    ...overrides,
  }
}

// ============================================================================
// Message Factories
// ============================================================================

/**
 * Creates a mock message with sensible defaults
 */
export function createMockMessage(overrides?: Partial<Message>): Message {
  return {
    id: `msg-${crypto.randomUUID().slice(0, 8)}`,
    role: 'user',
    content: 'Test message content',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Creates a mock assistant message
 */
export function createMockAssistantMessage(
  content: string,
  overrides?: Partial<Message>
): Message {
  return createMockMessage({
    role: 'assistant',
    content,
    toolsUsed: [],
    ...overrides,
  })
}

/**
 * Creates a mock user message
 */
export function createMockUserMessage(
  content: string,
  overrides?: Partial<Message>
): Message {
  return createMockMessage({
    role: 'user',
    content,
    ...overrides,
  })
}

// ============================================================================
// StreamChunk Factories
// ============================================================================

/**
 * Creates a mock stream chunk
 */
export function createMockStreamChunk(
  type: StreamChunk['type'],
  data: string,
  overrides?: Partial<StreamChunk>
): StreamChunk {
  return {
    type,
    data,
    sessionId: `session-${crypto.randomUUID().slice(0, 8)}`,
    ...overrides,
  } as StreamChunk
}

// ============================================================================
// WebSocket Mock
// ============================================================================

/**
 * Mock WebSocket for testing hooks
 */
export class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((ev: Event) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  private sentMessages: unknown[] = []

  constructor(url: string) {
    this.url = url
  }

  send(data: unknown): void {
    this.sentMessages.push(typeof data === 'string' ? JSON.parse(data) : data)
  }

  close(_code?: number, _reason?: string): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }

  simulateClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close', { code, reason }))
  }

  simulateError(message = 'WebSocket error'): void {
    this.onerror?.(new ErrorEvent('error', { message }))
  }

  getSentMessages(): unknown[] {
    return this.sentMessages
  }

  clearSentMessages(): void {
    this.sentMessages = []
  }
}

// ============================================================================
// Wait Utilities
// ============================================================================

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  throw new Error(`waitFor timed out after ${timeout}ms`)
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }

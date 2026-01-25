/**
 * Mock for @anthropic-ai/claude-agent-sdk
 *
 * Usage in tests:
 *
 * @example
 * import { describe, test, expect, beforeEach, mock } from 'bun:test'
 * import { createMockSDKResponse, createMockQueryGenerator, MockQueryGenerator } from '../__mocks__/anthropic'
 *
 * beforeEach(() => {
 *   // Mock the SDK module
 *   mock.module('@anthropic-ai/claude-agent-sdk', () => ({
 *     query: createMockQueryGenerator([
 *       createMockSDKResponse.system({ session_id: 'test-session' }),
 *       createMockSDKResponse.assistant({ text: 'Hello from Claude!' }),
 *       createMockSDKResponse.result({ result: 'Hello from Claude!', session_id: 'test-session' }),
 *     ])
 *   }))
 * })
 */

// ============================================================================
// SDK Message Types
// ============================================================================

export interface SDKSystemMessage {
  type: 'system'
  subtype?: 'init'
  session_id: string
  cwd?: string
  model?: string
  tools?: string[]
}

export interface SDKAssistantMessage {
  type: 'assistant'
  session_id: string
  message: {
    content: Array<
      | { type: 'text'; text: string }
      | { type: 'thinking'; text: string }
      | { type: 'tool_use'; id: string; name: string; input: unknown }
    >
  }
}

export interface SDKUserMessage {
  type: 'user'
  session_id: string
  message: {
    content: Array<
      | { type: 'text'; text: string }
      | { type: 'tool_result'; tool_use_id: string; content: string }
    >
  }
}

export interface SDKResultMessage {
  type: 'result'
  subtype: 'success' | 'error'
  session_id: string
  result: string
  total_cost_usd: number
  duration_ms: number
  is_error?: boolean
}

export interface SDKStreamEventMessage {
  type: 'stream_event'
  session_id: string
  event: {
    type: string
    delta?: {
      type: 'text_delta' | 'thinking_delta'
      text?: string
    }
  }
}

export type SDKMessage =
  | SDKSystemMessage
  | SDKAssistantMessage
  | SDKUserMessage
  | SDKResultMessage
  | SDKStreamEventMessage

// ============================================================================
// Response Factories
// ============================================================================

/**
 * Factory functions for creating mock SDK responses
 */
export const createMockSDKResponse = {
  /**
   * Creates a system init message
   */
  system(options: {
    session_id: string
    cwd?: string
    model?: string
    tools?: string[]
  }): SDKSystemMessage {
    return {
      type: 'system',
      subtype: 'init',
      session_id: options.session_id,
      cwd: options.cwd ?? '/test/cwd',
      model: options.model ?? 'claude-sonnet-4-20250514',
      tools: options.tools ?? ['Read', 'Write', 'Bash', 'Glob', 'Grep'],
    }
  },

  /**
   * Creates an assistant message with text content
   */
  assistant(options: {
    text?: string
    thinking?: string
    toolUse?: { id: string; name: string; input: unknown }
    session_id?: string
  }): SDKAssistantMessage {
    const content: SDKAssistantMessage['message']['content'] = []

    if (options.thinking) {
      content.push({ type: 'thinking', text: options.thinking })
    }

    if (options.text) {
      content.push({ type: 'text', text: options.text })
    }

    if (options.toolUse) {
      content.push({
        type: 'tool_use',
        id: options.toolUse.id,
        name: options.toolUse.name,
        input: options.toolUse.input,
      })
    }

    return {
      type: 'assistant',
      session_id: options.session_id ?? 'test-session',
      message: { content },
    }
  },

  /**
   * Creates a user message (typically tool results)
   */
  user(options: {
    text?: string
    toolResult?: { tool_use_id: string; content: string }
    session_id?: string
  }): SDKUserMessage {
    const content: SDKUserMessage['message']['content'] = []

    if (options.text) {
      content.push({ type: 'text', text: options.text })
    }

    if (options.toolResult) {
      content.push({
        type: 'tool_result',
        tool_use_id: options.toolResult.tool_use_id,
        content: options.toolResult.content,
      })
    }

    return {
      type: 'user',
      session_id: options.session_id ?? 'test-session',
      message: { content },
    }
  },

  /**
   * Creates a result message (final response)
   */
  result(options: {
    result: string
    session_id?: string
    success?: boolean
    cost_usd?: number
    duration_ms?: number
  }): SDKResultMessage {
    return {
      type: 'result',
      subtype: options.success !== false ? 'success' : 'error',
      session_id: options.session_id ?? 'test-session',
      result: options.result,
      total_cost_usd: options.cost_usd ?? 0.01,
      duration_ms: options.duration_ms ?? 1000,
    }
  },

  /**
   * Creates a stream event message (for partial text)
   */
  streamEvent(options: {
    delta: string
    type?: 'text_delta' | 'thinking_delta'
    session_id?: string
  }): SDKStreamEventMessage {
    return {
      type: 'stream_event',
      session_id: options.session_id ?? 'test-session',
      event: {
        type: 'content_block_delta',
        delta: {
          type: options.type ?? 'text_delta',
          text: options.delta,
        },
      },
    }
  },
}

// ============================================================================
// Mock Generator
// ============================================================================

/**
 * Creates a mock query generator function that yields given messages
 */
export function createMockQueryGenerator(
  messages: SDKMessage[]
): (options: { prompt: string; options?: unknown }) => AsyncGenerator<SDKMessage> {
  return async function* mockQuery(): AsyncGenerator<SDKMessage> {
    for (const message of messages) {
      yield message
    }
  }
}

/**
 * A more flexible mock generator that can be configured per test
 */
export class MockQueryGenerator {
  private messages: SDKMessage[] = []
  private delay = 0

  /**
   * Sets the messages to yield
   */
  withMessages(messages: SDKMessage[]): this {
    this.messages = messages
    return this
  }

  /**
   * Sets delay between messages (for testing streaming)
   */
  withDelay(ms: number): this {
    this.delay = ms
    return this
  }

  /**
   * Creates a simple text response
   */
  static simpleResponse(text: string, sessionId = 'test-session'): SDKMessage[] {
    return [
      createMockSDKResponse.system({ session_id: sessionId }),
      createMockSDKResponse.assistant({ text, session_id: sessionId }),
      createMockSDKResponse.result({ result: text, session_id: sessionId }),
    ]
  }

  /**
   * Creates a response with tool usage
   */
  static withToolUse(
    toolName: string,
    toolInput: unknown,
    toolOutput: string,
    finalText: string,
    sessionId = 'test-session'
  ): SDKMessage[] {
    const toolId = `tool-${crypto.randomUUID().slice(0, 8)}`

    return [
      createMockSDKResponse.system({ session_id: sessionId }),
      createMockSDKResponse.assistant({
        toolUse: { id: toolId, name: toolName, input: toolInput },
        session_id: sessionId,
      }),
      createMockSDKResponse.user({
        toolResult: { tool_use_id: toolId, content: toolOutput },
        session_id: sessionId,
      }),
      createMockSDKResponse.assistant({ text: finalText, session_id: sessionId }),
      createMockSDKResponse.result({ result: finalText, session_id: sessionId }),
    ]
  }

  /**
   * Creates the generator function
   */
  build(): (options: { prompt: string; options?: unknown }) => AsyncGenerator<SDKMessage> {
    const messages = this.messages
    const delay = this.delay

    return async function* mockQuery(): AsyncGenerator<SDKMessage> {
      for (const message of messages) {
        if (delay > 0) {
          await Bun.sleep(delay)
        }
        yield message
      }
    }
  }
}

// ============================================================================
// Module Mock Helper
// ============================================================================

/**
 * Creates a complete module mock for @anthropic-ai/claude-agent-sdk
 *
 * @example
 * beforeEach(() => {
 *   mock.module('@anthropic-ai/claude-agent-sdk', () =>
 *     createSDKModuleMock(MockQueryGenerator.simpleResponse('Hello!'))
 *   )
 * })
 */
export function createSDKModuleMock(messages: SDKMessage[]): {
  query: (options: { prompt: string; options?: unknown }) => AsyncGenerator<SDKMessage>
} {
  return {
    query: createMockQueryGenerator(messages),
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Collects all messages from a mock query generator
 */
export async function collectSDKMessages(
  generator: AsyncGenerator<SDKMessage>
): Promise<SDKMessage[]> {
  const messages: SDKMessage[] = []
  for await (const msg of generator) {
    messages.push(msg)
  }
  return messages
}

/**
 * Extracts text from assistant messages
 */
export function extractTextFromMessages(messages: SDKMessage[]): string {
  return messages
    .filter((m): m is SDKAssistantMessage => m.type === 'assistant')
    .flatMap((m) =>
      m.message.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map((c) => c.text)
    )
    .join('')
}

/**
 * Extracts tools used from assistant messages
 */
export function extractToolsFromMessages(messages: SDKMessage[]): string[] {
  return messages
    .filter((m): m is SDKAssistantMessage => m.type === 'assistant')
    .flatMap((m) =>
      m.message.content
        .filter(
          (c): c is { type: 'tool_use'; id: string; name: string; input: unknown } =>
            c.type === 'tool_use'
        )
        .map((c) => c.name)
    )
}

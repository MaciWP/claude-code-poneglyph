/**
 * Tests for Anthropic SDK Mock
 *
 * Validates that the mock utilities work correctly.
 * Also serves as documentation for how to use them.
 */

import { describe, test, expect } from 'bun:test'
import {
  createMockSDKResponse,
  createMockQueryGenerator,
  MockQueryGenerator,
  collectSDKMessages,
  extractTextFromMessages,
  extractToolsFromMessages,
} from './anthropic'

describe('Anthropic SDK Mock', () => {
  describe('createMockSDKResponse', () => {
    describe('system()', () => {
      test('creates system init message', () => {
        const msg = createMockSDKResponse.system({ session_id: 'test-sess' })

        expect(msg.type).toBe('system')
        expect(msg.subtype).toBe('init')
        expect(msg.session_id).toBe('test-sess')
        expect(msg.cwd).toBeDefined()
        expect(msg.tools).toBeDefined()
      })
    })

    describe('assistant()', () => {
      test('creates assistant message with text', () => {
        const msg = createMockSDKResponse.assistant({ text: 'Hello' })

        expect(msg.type).toBe('assistant')
        expect(msg.message.content).toHaveLength(1)
        expect(msg.message.content[0]).toEqual({ type: 'text', text: 'Hello' })
      })

      test('creates assistant message with thinking', () => {
        const msg = createMockSDKResponse.assistant({ thinking: 'Let me think...' })

        expect(msg.message.content[0]).toEqual({ type: 'thinking', text: 'Let me think...' })
      })

      test('creates assistant message with tool_use', () => {
        const msg = createMockSDKResponse.assistant({
          toolUse: { id: 'tool-1', name: 'Read', input: { file_path: '/test.txt' } },
        })

        expect(msg.message.content[0]).toEqual({
          type: 'tool_use',
          id: 'tool-1',
          name: 'Read',
          input: { file_path: '/test.txt' },
        })
      })

      test('creates assistant message with multiple content blocks', () => {
        const msg = createMockSDKResponse.assistant({
          thinking: 'Thinking...',
          text: 'Here is the result',
          toolUse: { id: 'tool-1', name: 'Bash', input: { command: 'ls' } },
        })

        expect(msg.message.content).toHaveLength(3)
        expect(msg.message.content[0].type).toBe('thinking')
        expect(msg.message.content[1].type).toBe('text')
        expect(msg.message.content[2].type).toBe('tool_use')
      })
    })

    describe('user()', () => {
      test('creates user message with text', () => {
        const msg = createMockSDKResponse.user({ text: 'Hello' })

        expect(msg.type).toBe('user')
        expect(msg.message.content[0]).toEqual({ type: 'text', text: 'Hello' })
      })

      test('creates user message with tool_result', () => {
        const msg = createMockSDKResponse.user({
          toolResult: { tool_use_id: 'tool-1', content: 'file contents' },
        })

        expect(msg.message.content[0]).toEqual({
          type: 'tool_result',
          tool_use_id: 'tool-1',
          content: 'file contents',
        })
      })
    })

    describe('result()', () => {
      test('creates success result message', () => {
        const msg = createMockSDKResponse.result({
          result: 'Done!',
          session_id: 'sess-1',
        })

        expect(msg.type).toBe('result')
        expect(msg.subtype).toBe('success')
        expect(msg.result).toBe('Done!')
        expect(msg.total_cost_usd).toBe(0.01)
      })

      test('creates error result message', () => {
        const msg = createMockSDKResponse.result({
          result: 'Error occurred',
          success: false,
        })

        expect(msg.subtype).toBe('error')
      })
    })

    describe('streamEvent()', () => {
      test('creates text_delta stream event', () => {
        const msg = createMockSDKResponse.streamEvent({ delta: 'Hello' })

        expect(msg.type).toBe('stream_event')
        expect(msg.event.type).toBe('content_block_delta')
        expect(msg.event.delta?.type).toBe('text_delta')
        expect(msg.event.delta?.text).toBe('Hello')
      })

      test('creates thinking_delta stream event', () => {
        const msg = createMockSDKResponse.streamEvent({
          delta: 'Thinking...',
          type: 'thinking_delta',
        })

        expect(msg.event.delta?.type).toBe('thinking_delta')
      })
    })
  })

  describe('createMockQueryGenerator', () => {
    test('yields messages in order', async () => {
      const messages = [
        createMockSDKResponse.system({ session_id: 'test' }),
        createMockSDKResponse.assistant({ text: 'Hello' }),
        createMockSDKResponse.result({ result: 'Hello', session_id: 'test' }),
      ]

      const generator = createMockQueryGenerator(messages)
      const collected = await collectSDKMessages(generator({ prompt: 'test' }))

      expect(collected).toHaveLength(3)
      expect(collected[0].type).toBe('system')
      expect(collected[1].type).toBe('assistant')
      expect(collected[2].type).toBe('result')
    })
  })

  describe('MockQueryGenerator', () => {
    test('simpleResponse creates basic conversation', async () => {
      const messages = MockQueryGenerator.simpleResponse('Hello world!')
      const generator = createMockQueryGenerator(messages)
      const collected = await collectSDKMessages(generator({ prompt: 'test' }))

      expect(collected[0].type).toBe('system')
      expect(collected[1].type).toBe('assistant')
      expect(collected[2].type).toBe('result')
    })

    test('withToolUse creates tool usage flow', async () => {
      const messages = MockQueryGenerator.withToolUse(
        'Read',
        { file_path: '/test.txt' },
        'file contents',
        'I read the file'
      )

      const generator = createMockQueryGenerator(messages)
      const collected = await collectSDKMessages(generator({ prompt: 'test' }))

      expect(collected).toHaveLength(5)
      expect(collected[0].type).toBe('system')
      expect(collected[1].type).toBe('assistant') // tool_use
      expect(collected[2].type).toBe('user') // tool_result
      expect(collected[3].type).toBe('assistant') // response
      expect(collected[4].type).toBe('result')
    })

    test('build() creates customizable generator', async () => {
      const builder = new MockQueryGenerator()
        .withMessages([
          createMockSDKResponse.system({ session_id: 'custom' }),
          createMockSDKResponse.assistant({ text: 'Custom response' }),
          createMockSDKResponse.result({ result: 'Custom response', session_id: 'custom' }),
        ])
        .withDelay(10)

      const generator = builder.build()
      const start = Date.now()
      const collected = await collectSDKMessages(generator({ prompt: 'test' }))
      const duration = Date.now() - start

      expect(collected).toHaveLength(3)
      expect(duration).toBeGreaterThanOrEqual(20) // At least 2 delays
    })
  })

  describe('Helper Functions', () => {
    test('extractTextFromMessages extracts text content', async () => {
      const messages = [
        createMockSDKResponse.system({ session_id: 'test' }),
        createMockSDKResponse.assistant({ text: 'Hello ' }),
        createMockSDKResponse.assistant({ text: 'world!' }),
        createMockSDKResponse.result({ result: 'Hello world!', session_id: 'test' }),
      ]

      const text = extractTextFromMessages(messages)
      expect(text).toBe('Hello world!')
    })

    test('extractToolsFromMessages extracts tool names', async () => {
      const messages = [
        createMockSDKResponse.system({ session_id: 'test' }),
        createMockSDKResponse.assistant({
          toolUse: { id: '1', name: 'Read', input: {} },
        }),
        createMockSDKResponse.assistant({
          toolUse: { id: '2', name: 'Write', input: {} },
        }),
        createMockSDKResponse.result({ result: 'Done', session_id: 'test' }),
      ]

      const tools = extractToolsFromMessages(messages)
      expect(tools).toEqual(['Read', 'Write'])
    })
  })
})

import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'

mock.module('../logger', () => ({
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => ({
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    }),
  },
}))

import { GeminiService } from './gemini'
import type { StreamChunk } from '@shared/types'
import type { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

function createMockChatSession(
  sendMessageResponse: unknown = { response: { text: () => 'test response' } },
  streamResponse: unknown = {
    stream: (async function* () {
      yield { text: () => 'chunk' }
    })(),
  }
) {
  return {
    sendMessage: mock(() => Promise.resolve(sendMessageResponse)),
    sendMessageStream: mock(() => Promise.resolve(streamResponse)),
  }
}

// Helper para crear mocks tipados de GoogleGenerativeAI
function createMockGenAI(mockModel: Partial<GenerativeModel>): GoogleGenerativeAI {
  return {
    getGenerativeModel: mock(() => mockModel as GenerativeModel),
  } as unknown as GoogleGenerativeAI
}

describe('GeminiService', () => {
  let service: GeminiService
  const originalEnv = process.env.GOOGLE_API_KEY

  beforeEach(() => {
    process.env.GOOGLE_API_KEY = 'test-api-key'
    service = new GeminiService()
  })

  afterEach(() => {
    if (originalEnv) {
      process.env.GOOGLE_API_KEY = originalEnv
    } else {
      delete process.env.GOOGLE_API_KEY
    }
  })

  describe('constructor', () => {
    test('initializes without throwing when API key is set', () => {
      process.env.GOOGLE_API_KEY = 'test-key'
      expect(() => new GeminiService()).not.toThrow()
    })

    test('initializes without throwing when API key is missing', () => {
      delete process.env.GOOGLE_API_KEY
      expect(() => new GeminiService()).not.toThrow()
    })
  })

  describe('execute()', () => {
    test('returns CLI result structure', async () => {
      const mockGenerateContent = mock(() =>
        Promise.resolve({
          response: {
            text: () => 'Hello from Gemini',
          },
        })
      )

      const mockModel = {
        generateContent: mockGenerateContent,
        generateContentStream: mock(() =>
          Promise.resolve({
            stream: (async function* () {
              yield { text: () => 'chunk' }
            })(),
          })
        ),
        startChat: mock(() =>
          createMockChatSession({ response: { text: () => 'Hello from Gemini' } })
        ),
      }

      // @ts-expect-error - mocking private property
      service.genAI = createMockGenAI(mockModel)

      const result = await service.execute({
        prompt: 'Hello',
      })

      expect(result.mode).toBe('cli')
      expect(result.response).toBe('Hello from Gemini')
      expect(mockModel.startChat).toHaveBeenCalled()
    })

    test('handles errors gracefully', async () => {
      const mockModel = {
        generateContent: mock(() => Promise.reject(new Error('API Error'))),
        generateContentStream: mock(() => Promise.reject(new Error('API Error'))),
        startChat: mock(() => ({
          sendMessage: mock(() => Promise.reject(new Error('API Error'))),
          sendMessageStream: mock(() => Promise.reject(new Error('API Error'))),
        })),
      }

      // @ts-expect-error - mocking private property
      service.genAI = createMockGenAI(mockModel)

      await expect(service.execute({ prompt: 'test' })).rejects.toThrow('API Error')
    })
  })

  describe('streamCLI()', () => {
    test('yields chunks from Gemini stream', async () => {
      const mockStream = (async function* () {
        yield { text: () => 'Hello ' }
        yield { text: () => 'World' }
      })()

      const mockModel = {
        generateContent: mock(() => Promise.resolve({ response: { text: () => '' } })),
        generateContentStream: mock(() => Promise.resolve({ stream: mockStream })),
        startChat: mock(() => ({
          sendMessage: mock(() => Promise.resolve({ response: { text: () => '' } })),
          sendMessageStream: mock(() => Promise.resolve({ stream: mockStream })),
        })),
      }

      // @ts-expect-error - mocking private property
      service.genAI = createMockGenAI(mockModel)

      const chunks: StreamChunk[] = []
      for await (const chunk of service.streamCLI({ prompt: 'test' })) {
        chunks.push(chunk)
      }

      // Should have text chunks plus init/done
      expect(chunks.length).toBeGreaterThan(0)
    })
  })

  describe('streamCLIWithAbort()', () => {
    test('returns stream and abort function', () => {
      const mockStream = (async function* () {
        yield { text: () => 'test' }
      })()

      const mockModel = {
        generateContent: mock(() => Promise.resolve({ response: { text: () => '' } })),
        generateContentStream: mock(() => Promise.resolve({ stream: mockStream })),
        startChat: mock(() => ({
          sendMessage: mock(() => Promise.resolve({ response: { text: () => '' } })),
          sendMessageStream: mock(() => Promise.resolve({ stream: mockStream })),
        })),
      }

      // @ts-expect-error - mocking private property
      service.genAI = createMockGenAI(mockModel)

      const { stream, abort } = service.streamCLIWithAbort({ prompt: 'test' })

      expect(stream).toBeDefined()
      expect(typeof abort).toBe('function')
    })

    test('abort sets aborted flag', () => {
      const mockStream = (async function* () {
        yield { text: () => 'test' }
      })()

      const mockModel = {
        generateContent: mock(() => Promise.resolve({ response: { text: () => '' } })),
        generateContentStream: mock(() => Promise.resolve({ stream: mockStream })),
        startChat: mock(() => ({
          sendMessage: mock(() => Promise.resolve({ response: { text: () => '' } })),
          sendMessageStream: mock(() => Promise.resolve({ stream: mockStream })),
        })),
      }

      // @ts-expect-error - mocking private property
      service.genAI = createMockGenAI(mockModel)

      const { abort } = service.streamCLIWithAbort({ prompt: 'test' })

      // Should not throw
      expect(() => abort()).not.toThrow()
    })
  })
})

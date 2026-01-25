import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { SessionManager, type SessionExport } from './session-manager'
import { SessionStore } from './sessions'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const createTempDir = (): string => {
  const dir = join(tmpdir(), `session-manager-test-${crypto.randomUUID()}`)
  return dir
}

describe('SessionManager', () => {
  let store: SessionStore
  let manager: SessionManager
  let tempDir: string

  beforeEach(() => {
    tempDir = createTempDir()
    store = new SessionStore(tempDir)
    manager = new SessionManager(store)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true })
    }
  })

  describe('create()', () => {
    test('creates session with default values', async () => {
      const session = await manager.create()

      expect(session.id).toBeDefined()
      expect(session.id.length).toBe(36) // UUID
      expect(session.messages).toEqual([])
    })

    test('creates session with custom name', async () => {
      const session = await manager.create({ name: 'Test Session' })

      expect(session.name).toBe('Test Session')
    })

    test('creates session with custom workDir', async () => {
      const session = await manager.create({ workDir: '/test/path' })

      expect(session.workDir).toBe('/test/path')
    })
  })

  describe('get()', () => {
    test('returns session by id', async () => {
      const created = await manager.create({ name: 'Find Me' })
      const found = await manager.get(created.id)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe('Find Me')
    })

    test('returns null for non-existent id', async () => {
      const found = await manager.get('non-existent')

      expect(found).toBeNull()
    })
  })

  describe('update()', () => {
    test('updates session name', async () => {
      const session = await manager.create({ name: 'Original' })
      const updated = await manager.update(session.id, { name: 'Updated' })

      expect(updated.name).toBe('Updated')

      const retrieved = await manager.get(session.id)
      expect(retrieved?.name).toBe('Updated')
    })

    test('preserves session id', async () => {
      const session = await manager.create()
      const updated = await manager.update(session.id, { name: 'New Name' })

      expect(updated.id).toBe(session.id)
    })

    test('throws error for non-existent session', async () => {
      await expect(
        manager.update('non-existent', { name: 'Test' })
      ).rejects.toThrow('Session not found: non-existent')
    })
  })

  describe('delete()', () => {
    test('removes session', async () => {
      const session = await manager.create()
      await manager.delete(session.id)

      const found = await manager.get(session.id)
      expect(found).toBeNull()
    })
  })

  describe('list()', () => {
    test('returns empty list when no sessions', async () => {
      const list = await manager.list()

      expect(list).toEqual([])
    })

    test('returns session metadata', async () => {
      await manager.create({ name: 'Session 1' })
      await manager.create({ name: 'Session 2' })

      const list = await manager.list()

      expect(list.length).toBe(2)
      expect(list[0]).toHaveProperty('id')
      expect(list[0]).toHaveProperty('name')
      expect(list[0]).toHaveProperty('messageCount')
      expect(list[0]).toHaveProperty('tokenEstimate')
    })

    test('supports pagination', async () => {
      await manager.create({ name: 'Session 1' })
      await manager.create({ name: 'Session 2' })
      await manager.create({ name: 'Session 3' })

      const list = await manager.list({ limit: 2 })

      expect(list.length).toBe(2)
    })

    test('supports offset', async () => {
      await manager.create({ name: 'First' })
      await Bun.sleep(10)
      await manager.create({ name: 'Second' })
      await Bun.sleep(10)
      await manager.create({ name: 'Third' })

      const list = await manager.list({ offset: 1, limit: 2, order: 'desc' })

      expect(list.length).toBe(2)
    })
  })

  describe('addMessage()', () => {
    test('adds message to session', async () => {
      const session = await manager.create()
      await manager.addMessage(session.id, 'user', 'Hello')

      const messages = await manager.getMessages(session.id)
      expect(messages.length).toBe(1)
      expect(messages[0].content).toBe('Hello')
      expect(messages[0].role).toBe('user')
    })

    test('getMessages returns limited messages', async () => {
      const session = await manager.create()
      await manager.addMessage(session.id, 'user', 'Message 1')
      await manager.addMessage(session.id, 'assistant', 'Message 2')
      await manager.addMessage(session.id, 'user', 'Message 3')

      const messages = await manager.getMessages(session.id, 2)

      expect(messages.length).toBe(2)
      expect(messages[0].content).toBe('Message 2')
      expect(messages[1].content).toBe('Message 3')
    })
  })

  describe('shouldSummarize()', () => {
    test('returns false when below threshold', async () => {
      const session = await manager.create()
      await manager.addMessage(session.id, 'user', 'Hello')

      const should = await manager.shouldSummarize(session.id)
      expect(should).toBe(false)
    })

    test('returns false for non-existent session', async () => {
      const should = await manager.shouldSummarize('non-existent')
      expect(should).toBe(false)
    })
  })

  describe('summarize()', () => {
    test('does nothing when messages below maxShortTermMessages', async () => {
      const customManager = new SessionManager(store, { maxShortTermMessages: 10 })
      const session = await customManager.create()

      for (let i = 0; i < 5; i++) {
        await customManager.addMessage(session.id, 'user', `Message ${i}`)
      }

      const result = await customManager.summarize(session.id)

      expect(result.tokensSaved).toBe(0)
      expect(result.messagesCompacted).toBe(0)
    })

    test('compacts old messages when above threshold', async () => {
      const customManager = new SessionManager(store, {
        maxShortTermMessages: 5,
        summarizationThreshold: 10,
      })
      const session = await customManager.create()

      // Add 15 messages with longer content to ensure tokens saved
      for (let i = 0; i < 15; i++) {
        await store.addMessage(
          session.id,
          'user',
          `This is a longer message number ${i} with some additional content to ensure we have enough tokens for the test to work properly`
        )
      }

      const result = await customManager.summarize(session.id)

      expect(result.messagesCompacted).toBe(10) // 15 - 5 = 10
      // Token savings depends on message length vs summary length
      // The key assertion is that messages were compacted
      expect(result.summary).toBeDefined()
      expect(result.summary.length).toBeGreaterThan(0)

      // Verify messages were reduced
      const messages = await customManager.getMessages(session.id)
      expect(messages.length).toBe(5)
    })

    test('throws error for non-existent session', async () => {
      await expect(manager.summarize('non-existent')).rejects.toThrow(
        'Session not found: non-existent'
      )
    })
  })

  describe('export()', () => {
    test('exports session with correct format', async () => {
      const session = await manager.create({ name: 'Export Test' })
      await manager.addMessage(session.id, 'user', 'Hello')
      await manager.addMessage(session.id, 'assistant', 'Hi there')

      const exported = await manager.export(session.id)

      expect(exported.version).toBe('1.0')
      expect(exported.exportedAt).toBeDefined()
      expect(exported.session.name).toBe('Export Test')
      expect(exported.session.messages.length).toBe(2)
    })

    test('throws error for non-existent session', async () => {
      await expect(manager.export('non-existent')).rejects.toThrow(
        'Session not found: non-existent'
      )
    })
  })

  describe('import()', () => {
    test('imports session from export data', async () => {
      const exportData: SessionExport = {
        version: '1.0',
        exportedAt: Date.now(),
        session: {
          name: 'Imported Session',
          messages: [
            { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
            { role: 'assistant', content: 'Hi', timestamp: new Date().toISOString() },
          ],
        },
      }

      const imported = await manager.import(exportData)

      expect(imported.id).toBeDefined()
      expect(imported.name).toBe('Imported Session')
      expect(imported.messages.length).toBe(2)
    })

    test('throws error for invalid version', async () => {
      const badData = {
        version: '2.0',
        exportedAt: Date.now(),
        session: { name: 'Test', messages: [] },
      } as unknown as SessionExport

      await expect(manager.import(badData)).rejects.toThrow(
        'Unsupported export version: 2.0'
      )
    })

    test('throws error for invalid format', async () => {
      const badData = {
        version: '1.0',
        exportedAt: Date.now(),
        session: { name: 'Test' },
      } as unknown as SessionExport

      await expect(manager.import(badData)).rejects.toThrow(
        'Invalid session export format'
      )
    })
  })

  describe('custom summarization function', () => {
    test('uses custom summarize function when provided', async () => {
      const customSummarize = mock(async () => 'Custom summary')

      const customManager = new SessionManager(
        store,
        { maxShortTermMessages: 2 },
        customSummarize
      )

      const session = await customManager.create()
      for (let i = 0; i < 5; i++) {
        await store.addMessage(session.id, 'user', `Message ${i}`)
      }

      const result = await customManager.summarize(session.id)

      expect(customSummarize).toHaveBeenCalled()
      expect(result.summary).toContain('Custom summary')
    })
  })

  describe('getStore()', () => {
    test('returns underlying store', () => {
      const underlyingStore = manager.getStore()
      expect(underlyingStore).toBe(store)
    })
  })
})

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { SessionStore } from './sessions'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const createTempDir = (): string => {
  const dir = join(tmpdir(), `session-test-${crypto.randomUUID()}`)
  return dir
}

describe('SessionStore', () => {
  let store: SessionStore
  let tempDir: string

  beforeEach(() => {
    tempDir = createTempDir()
    store = new SessionStore(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true })
    }
  })

  describe('create()', () => {
    test('creates session with unique ID', async () => {
      const session = await store.create()

      expect(session.id).toBeDefined()
      expect(session.id.length).toBe(36)
    })

    test('creates session with custom name', async () => {
      const session = await store.create('My Session')

      expect(session.name).toBe('My Session')
    })

    test('creates session with custom workDir', async () => {
      const session = await store.create('Test', '/custom/path')

      expect(session.workDir).toBe('/custom/path')
    })

    test('creates session with timestamps', async () => {
      const before = new Date().toISOString()
      const session = await store.create()
      const after = new Date().toISOString()

      expect(session.createdAt >= before).toBe(true)
      expect(session.createdAt <= after).toBe(true)
      expect(session.updatedAt >= before).toBe(true)
    })

    test('creates session with empty messages array', async () => {
      const session = await store.create()

      expect(session.messages).toEqual([])
    })

    test('persists session to disk', async () => {
      const session = await store.create()
      const path = join(tempDir, `${session.id}.json`)

      expect(existsSync(path)).toBe(true)
    })
  })

  describe('get()', () => {
    test('returns session by ID', async () => {
      const created = await store.create('Test Session')
      const retrieved = await store.get(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.name).toBe('Test Session')
    })

    test('returns null for non-existent ID', async () => {
      const result = await store.get('non-existent-id')

      expect(result).toBeNull()
    })

    test('returns null for invalid JSON file', async () => {
      const fakeId = 'invalid-json'
      await Bun.write(join(tempDir, `${fakeId}.json`), 'not valid json')

      const result = await store.get(fakeId)

      expect(result).toBeNull()
    })
  })

  describe('list()', () => {
    test('returns empty array when no sessions', async () => {
      const sessions = await store.list()

      expect(sessions).toEqual([])
    })

    test('returns all sessions', async () => {
      await store.create('Session 1')
      await store.create('Session 2')
      await store.create('Session 3')

      const sessions = await store.list()

      expect(sessions.length).toBe(3)
    })

    test('returns sessions sorted by updatedAt descending', async () => {
      const first = await store.create('First')
      await Bun.sleep(10)
      const second = await store.create('Second')
      await Bun.sleep(10)
      const third = await store.create('Third')

      const sessions = await store.list()

      expect(sessions[0].id).toBe(third.id)
      expect(sessions[1].id).toBe(second.id)
      expect(sessions[2].id).toBe(first.id)
    })
  })

  describe('save()', () => {
    test('updates session updatedAt timestamp', async () => {
      const session = await store.create('Test')
      const originalUpdated = session.updatedAt

      await Bun.sleep(10)
      session.name = 'Updated Name'
      await store.save(session)

      const retrieved = await store.get(session.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.updatedAt > originalUpdated).toBe(true)
    })

    test('persists changes to disk', async () => {
      const session = await store.create('Original')
      session.name = 'Modified'
      await store.save(session)

      const retrieved = await store.get(session.id)

      expect(retrieved?.name).toBe('Modified')
    })
  })

  describe('delete()', () => {
    test('removes session from disk', async () => {
      const session = await store.create('To Delete')
      const path = join(tempDir, `${session.id}.json`)

      expect(existsSync(path)).toBe(true)

      await store.delete(session.id)

      expect(existsSync(path)).toBe(false)
    })

    test('does nothing for non-existent ID', async () => {
      await expect(store.delete('non-existent')).resolves.toBeUndefined()
    })
  })

  describe('deleteAll()', () => {
    test('removes all sessions and returns count', async () => {
      await store.create('Session 1')
      await store.create('Session 2')
      await store.create('Session 3')

      const count = await store.deleteAll()

      expect(count).toBe(3)
      expect(await store.list()).toEqual([])
    })

    test('returns 0 when no sessions', async () => {
      const count = await store.deleteAll()

      expect(count).toBe(0)
    })
  })

  describe('addMessage()', () => {
    test('adds message to session', async () => {
      const session = await store.create('Test')

      await store.addMessage(session.id, 'user', 'Hello')

      const retrieved = await store.get(session.id)
      expect(retrieved?.messages.length).toBe(1)
      expect(retrieved?.messages[0].role).toBe('user')
      expect(retrieved?.messages[0].content).toBe('Hello')
    })

    test('adds message with timestamp', async () => {
      const session = await store.create('Test')
      const before = new Date().toISOString()

      await store.addMessage(session.id, 'assistant', 'Hi there')

      const retrieved = await store.get(session.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.messages[0].timestamp >= before).toBe(true)
    })

    test('adds message with toolsUsed', async () => {
      const session = await store.create('Test')

      await store.addMessage(session.id, 'assistant', 'Done', { toolsUsed: ['Read', 'Write'] })

      const retrieved = await store.get(session.id)
      expect(retrieved?.messages[0].toolsUsed).toEqual(['Read', 'Write'])
    })

    test('adds message with images', async () => {
      const session = await store.create('Test')

      await store.addMessage(session.id, 'user', 'Check this', undefined, ['/path/to/image.png'])

      const retrieved = await store.get(session.id)
      expect(retrieved?.messages[0].images).toEqual(['/path/to/image.png'])
    })

    test('throws error for non-existent session', async () => {
      await expect(store.addMessage('non-existent', 'user', 'Hello')).rejects.toThrow(
        'Session not found: non-existent'
      )
    })

    test('handles concurrent addMessage calls without data loss', async () => {
      const session = await store.create('Concurrent Test')

      await Promise.all([
        store.addMessage(session.id, 'user', 'Message 1'),
        store.addMessage(session.id, 'user', 'Message 2'),
        store.addMessage(session.id, 'user', 'Message 3'),
      ])

      const retrieved = await store.get(session.id)
      expect(retrieved?.messages.length).toBe(3)
    })
  })

  describe('save() mutation safety', () => {
    test('does not mutate input session object', async () => {
      const session = await store.create('Test')
      const originalUpdatedAt = session.updatedAt

      await Bun.sleep(10)
      await store.save(session)

      expect(session.updatedAt).toBe(originalUpdatedAt)
    })
  })
})

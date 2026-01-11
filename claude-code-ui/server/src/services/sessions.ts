import { mkdir, readFile, writeFile, readdir, unlink, access, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import type { Message, Session, ExecutionEvent, TokenUsage, ContextSnapshot, PersistedAgent } from '../../../shared/types'
import { logger } from '../logger'

interface RichMessageData {
  executionEvents?: ExecutionEvent[]
  usage?: TokenUsage
  costUsd?: number
  durationMs?: number
  contextSnapshot?: ContextSnapshot
  toolsUsed?: string[]
}

const log = logger.child('SessionStore')

export type { Message, Session }

const IMAGE_PREFIX = 'img://'
const BASE64_PATTERN = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/

export class SessionStore {
  private baseDir: string
  private imagesDir: string
  private initialized: Promise<void>
  private locks = new Map<string, Promise<void>>()

  constructor(baseDir: string) {
    this.baseDir = baseDir
    this.imagesDir = join(baseDir, '..', 'images')
    this.initialized = this.ensureDirs()
  }

  private async withLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
    while (this.locks.has(sessionId)) {
      await this.locks.get(sessionId)
    }

    let resolve!: () => void
    const lock = new Promise<void>(r => {
      resolve = r
    })
    this.locks.set(sessionId, lock)

    try {
      return await fn()
    } finally {
      this.locks.delete(sessionId)
      resolve()
    }
  }

  private async ensureDirs(): Promise<void> {
    try {
      await access(this.baseDir)
    } catch {
      await mkdir(this.baseDir, { recursive: true })
    }
    try {
      await access(this.imagesDir)
    } catch {
      await mkdir(this.imagesDir, { recursive: true })
    }
  }

  private getSessionImagesDir(sessionId: string): string {
    return join(this.imagesDir, sessionId)
  }

  private async saveImageFile(sessionId: string, dataUrl: string, index: number): Promise<string> {
    const match = dataUrl.match(BASE64_PATTERN)
    if (!match) return dataUrl

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
    const base64Data = dataUrl.replace(BASE64_PATTERN, '')
    const buffer = Buffer.from(base64Data, 'base64')

    const sessionImagesDir = this.getSessionImagesDir(sessionId)
    if (!existsSync(sessionImagesDir)) {
      await mkdir(sessionImagesDir, { recursive: true })
    }

    const filename = `${Date.now()}_${index}.${ext}`
    const filePath = join(sessionImagesDir, filename)
    await writeFile(filePath, buffer)

    log.debug('Saved image to file', { sessionId, filename, size: buffer.length })
    return `${IMAGE_PREFIX}${sessionId}/${filename}`
  }

  private async loadImageFile(imageRef: string): Promise<string> {
    if (!imageRef.startsWith(IMAGE_PREFIX)) return imageRef

    const relativePath = imageRef.slice(IMAGE_PREFIX.length)
    const filePath = join(this.imagesDir, relativePath)

    try {
      const buffer = await readFile(filePath)
      const ext = filePath.split('.').pop() || 'png'
      const mimeType = ext === 'jpg' ? 'jpeg' : ext
      return `data:image/${mimeType};base64,${buffer.toString('base64')}`
    } catch (error) {
      log.warn('Failed to load image file', { imageRef, error })
      return imageRef
    }
  }

  private async hydrateSessionImages(session: Session): Promise<Session> {
    const hydratedMessages = await Promise.all(
      session.messages.map(async (msg) => {
        if (!msg.images?.length) return msg
        const hydratedImages = await Promise.all(
          msg.images.map((img) => this.loadImageFile(img))
        )
        return { ...msg, images: hydratedImages }
      })
    )
    return { ...session, messages: hydratedMessages }
  }

  async create(name?: string, workDir?: string): Promise<Session> {
    await this.initialized

    const session: Session = {
      id: crypto.randomUUID(),
      name: name || `Session ${new Date().toLocaleTimeString()}`,
      workDir: workDir || resolve(process.cwd(), '..'),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.save(session)
    return session
  }

  /**
   * Get the file path for a session
   */
  getSessionFilePath(id: string): string {
    return join(this.baseDir, `${id}.json`)
  }

  async get(id: string): Promise<Session | null> {
    await this.initialized

    const path = this.getSessionFilePath(id)
    try {
      const data = await readFile(path, 'utf-8')
      const session: Session = JSON.parse(data)

      // Migrate legacy sessions to v2
      if (!session.version || session.version < 2) {
        session.version = 2
        session.agents = session.agents || []
      }

      return this.hydrateSessionImages(session)
    } catch (error) {
      log.error('Failed to read session', { sessionId: id, error })
      return null
    }
  }

  async list(): Promise<Session[]> {
    await this.initialized

    try {
      const files = await readdir(this.baseDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      const sessions = await Promise.all(
        jsonFiles.map(async file => {
          const id = file.replace('.json', '')
          return this.get(id)
        })
      )

      return sessions
        .filter((s): s is Session => s !== null)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } catch (error) {
      log.error('Failed to list sessions', { error })
      return []
    }
  }

  async save(session: Session): Promise<void> {
    await this.initialized

    const toSave = {
      ...session,
      updatedAt: new Date().toISOString(),
    }
    const path = join(this.baseDir, `${toSave.id}.json`)
    await writeFile(path, JSON.stringify(toSave, null, 2))
  }

  async delete(id: string): Promise<void> {
    await this.initialized

    const path = join(this.baseDir, `${id}.json`)
    try {
      await unlink(path)
    } catch (error) {
      log.warn('Failed to delete session file', { sessionId: id, error })
    }

    const sessionImagesDir = this.getSessionImagesDir(id)
    if (existsSync(sessionImagesDir)) {
      try {
        await rm(sessionImagesDir, { recursive: true })
        log.debug('Deleted session images', { sessionId: id })
      } catch (error) {
        log.warn('Failed to delete session images', { sessionId: id, error })
      }
    }
  }

  async deleteAll(): Promise<number> {
    const sessions = await this.list()
    await Promise.all(sessions.map(s => this.delete(s.id)))
    return sessions.length
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    richData?: RichMessageData,
    images?: string[]
  ): Promise<void> {
    await this.withLock(sessionId, async () => {
      const path = join(this.baseDir, `${sessionId}.json`)
      let session: Session
      try {
        const data = await readFile(path, 'utf-8')
        session = JSON.parse(data)
      } catch {
        throw new Error(`Session not found: ${sessionId}`)
      }

      let processedImages: string[] | undefined
      if (images?.length) {
        processedImages = await Promise.all(
          images.map((img, idx) => this.saveImageFile(sessionId, img, idx))
        )
      }

      const message: Message = {
        role,
        content,
        timestamp: new Date().toISOString(),
        images: processedImages,
      }

      // Add rich data if provided
      if (richData) {
        if (richData.executionEvents) message.executionEvents = richData.executionEvents
        if (richData.usage) message.usage = richData.usage
        if (richData.costUsd !== undefined) message.costUsd = richData.costUsd
        if (richData.durationMs !== undefined) message.durationMs = richData.durationMs
        if (richData.contextSnapshot) message.contextSnapshot = richData.contextSnapshot
        if (richData.toolsUsed) message.toolsUsed = richData.toolsUsed
      }

      session.messages.push(message)
      await this.save(session)
    })
  }

  async cleanupOldSessions(maxAgeDays: number = 30): Promise<number> {
    await this.initialized

    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000)
    const sessions = await this.list()
    let deleted = 0

    for (const session of sessions) {
      const updatedAt = new Date(session.updatedAt).getTime()
      if (updatedAt < cutoff) {
        await this.delete(session.id)
        deleted++
        log.info('Cleaned up old session', { sessionId: session.id, age: Math.floor((Date.now() - updatedAt) / 86400000) + ' days' })
      }
    }

    if (deleted > 0) {
      log.info('Session cleanup completed', { deleted, remaining: sessions.length - deleted })
    }

    return deleted
  }

  // Agent persistence methods

  async addAgent(sessionId: string, agent: PersistedAgent): Promise<void> {
    await this.withLock(sessionId, async () => {
      const path = join(this.baseDir, `${sessionId}.json`)
      let session: Session
      try {
        const data = await readFile(path, 'utf-8')
        session = JSON.parse(data)
      } catch {
        throw new Error(`Session not found: ${sessionId}`)
      }

      if (!session.agents) session.agents = []

      // Check if agent already exists (update instead of add)
      const existingIdx = session.agents.findIndex(a => a.id === agent.id)
      if (existingIdx !== -1) {
        session.agents[existingIdx] = agent
      } else {
        session.agents.push(agent)
      }

      await this.save(session)
    })
  }

  async updateAgent(sessionId: string, agentId: string, updates: Partial<PersistedAgent>): Promise<void> {
    await this.withLock(sessionId, async () => {
      const path = join(this.baseDir, `${sessionId}.json`)
      let session: Session
      try {
        const data = await readFile(path, 'utf-8')
        session = JSON.parse(data)
      } catch {
        throw new Error(`Session not found: ${sessionId}`)
      }

      if (!session.agents) return

      const idx = session.agents.findIndex(a => a.id === agentId)
      if (idx !== -1) {
        session.agents[idx] = { ...session.agents[idx], ...updates }
        await this.save(session)
      }
    })
  }

  async getPersistedAgents(sessionId: string): Promise<PersistedAgent[]> {
    const session = await this.get(sessionId)
    return session?.agents || []
  }
}

import type { Message, Session } from '@shared/types'
import type { SessionStore } from './sessions'
import { logger } from '../logger'

const log = logger.child('SessionManager')

// Session Management Types
export interface SessionMetadata {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  messageCount: number
  tokenEstimate: number
  summary: string
}

export interface SummarizationConfig {
  maxShortTermMessages: number
  summarizationThreshold: number
  summaryMaxTokens: number
}

export interface SessionExport {
  version: '1.0'
  exportedAt: number
  session: {
    name: string
    provider?: string
    modes?: {
      orchestrate?: boolean
      plan?: boolean
      bypassPermissions?: boolean
    }
    messages: Message[]
    longTermSummary?: string
    metrics?: Record<string, unknown>
    workDir?: string
  }
}

export interface SummarizationResult {
  summary: string
  tokensSaved: number
  messagesCompacted: number
}

export interface ListOptions {
  limit?: number
  offset?: number
  sortBy?: 'updatedAt' | 'createdAt' | 'name'
  order?: 'asc' | 'desc'
}

export interface CreateOptions {
  name?: string
  workDir?: string
  provider?: string
}

const DEFAULT_CONFIG: SummarizationConfig = {
  maxShortTermMessages: 20,
  summarizationThreshold: 50,
  summaryMaxTokens: 500,
}

// Simple token estimation: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function estimateMessageTokens(message: Message): number {
  let tokens = estimateTokens(message.content)
  if (message.toolsUsed?.length) {
    tokens += message.toolsUsed.length * 5
  }
  return tokens
}

function estimateSessionTokens(messages: Message[]): number {
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0)
}

/**
 * SessionManager provides enhanced session management with:
 * - Summarization for long conversations
 * - Export/Import functionality
 * - Session metadata generation
 */
export class SessionManager {
  private readonly store: SessionStore
  private readonly config: SummarizationConfig
  private readonly summarizeFn?: (messages: Message[]) => Promise<string>

  constructor(
    store: SessionStore,
    config: Partial<SummarizationConfig> = {},
    summarizeFn?: (messages: Message[]) => Promise<string>
  ) {
    this.store = store
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.summarizeFn = summarizeFn
  }

  // ==================== CRUD Operations ====================

  async create(options: CreateOptions = {}): Promise<Session> {
    const session = await this.store.create(options.name, options.workDir)
    log.info('Session created', { id: session.id, name: session.name })
    return session
  }

  async get(id: string): Promise<Session | null> {
    return this.store.get(id)
  }

  async update(id: string, data: Partial<Session>): Promise<Session> {
    const session = await this.store.get(id)
    if (!session) {
      throw new Error(`Session not found: ${id}`)
    }

    const updated: Session = {
      ...session,
      ...data,
      id: session.id, // Prevent ID modification
      createdAt: session.createdAt, // Prevent createdAt modification
    }

    await this.store.save(updated)
    log.info('Session updated', { id, fields: Object.keys(data) })
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.store.delete(id)
    log.info('Session deleted', { id })
  }

  async list(options: ListOptions = {}): Promise<SessionMetadata[]> {
    const sessions = await this.store.list()

    // Sort
    const sortBy = options.sortBy || 'updatedAt'
    const order = options.order || 'desc'
    sessions.sort((a, b) => {
      const aVal = sortBy === 'name' ? a.name : new Date(a[sortBy]).getTime()
      const bVal = sortBy === 'name' ? b.name : new Date(b[sortBy]).getTime()
      if (sortBy === 'name') {
        return order === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal))
      }
      return order === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
    })

    // Pagination
    const offset = options.offset || 0
    const limit = options.limit || sessions.length
    const paginated = sessions.slice(offset, offset + limit)

    // Transform to metadata
    return paginated.map((s) => this.toMetadata(s))
  }

  // ==================== Messages ====================

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    richData?: Record<string, unknown>,
    images?: string[]
  ): Promise<void> {
    await this.store.addMessage(sessionId, role, content, richData, images)

    // Check if summarization is needed
    if (await this.shouldSummarize(sessionId)) {
      log.info('Auto-summarization triggered', { sessionId })
      try {
        await this.summarize(sessionId)
      } catch (error) {
        log.warn('Auto-summarization failed', { sessionId, error })
        // Continue without summarization - will retry on next threshold
      }
    }
  }

  async getMessages(sessionId: string, limit?: number): Promise<Message[]> {
    const session = await this.store.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const messages = session.messages
    if (limit && limit < messages.length) {
      return messages.slice(-limit)
    }
    return messages
  }

  // ==================== Memory Management ====================

  async shouldSummarize(sessionId: string): Promise<boolean> {
    const session = await this.store.get(sessionId)
    if (!session) return false
    return session.messages.length >= this.config.summarizationThreshold
  }

  async summarize(sessionId: string): Promise<SummarizationResult> {
    const session = await this.store.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const messageCount = session.messages.length
    if (messageCount <= this.config.maxShortTermMessages) {
      return {
        summary: '',
        tokensSaved: 0,
        messagesCompacted: 0,
      }
    }

    // Messages to summarize (older ones)
    const toSummarize = session.messages.slice(
      0,
      messageCount - this.config.maxShortTermMessages
    )
    // Messages to keep (recent ones)
    const toKeep = session.messages.slice(-this.config.maxShortTermMessages)

    // Calculate tokens before summarization
    const tokensBefore = estimateSessionTokens(toSummarize)

    // Generate summary
    let summary: string
    if (this.summarizeFn) {
      summary = await this.summarizeFn(toSummarize)
    } else {
      // Default summarization: extract key information
      summary = this.defaultSummarize(toSummarize)
    }

    // Calculate tokens after summarization
    const tokensAfter = estimateTokens(summary)

    // Get existing summary and append
    const existingSummary = (session as Session & { longTermSummary?: string }).longTermSummary
    const combinedSummary = existingSummary
      ? `${existingSummary}\n\n---\n\n${summary}`
      : summary

    // Update session with summarized history
    const updated: Session & { longTermSummary?: string } = {
      ...session,
      messages: toKeep,
      longTermSummary: combinedSummary,
    }
    await this.store.save(updated as Session)

    const result: SummarizationResult = {
      summary: combinedSummary,
      tokensSaved: tokensBefore - tokensAfter,
      messagesCompacted: toSummarize.length,
    }

    log.info('Session summarized', {
      sessionId,
      messagesCompacted: result.messagesCompacted,
      tokensSaved: result.tokensSaved,
    })

    return result
  }

  private defaultSummarize(messages: Message[]): string {
    const points: string[] = []

    // Extract key topics from conversation
    const userMessages = messages.filter((m) => m.role === 'user')
    const assistantMessages = messages.filter((m) => m.role === 'assistant')

    // Add user requests summary
    if (userMessages.length > 0) {
      const topics = userMessages
        .slice(0, 5)
        .map((m) => m.content.slice(0, 100))
        .join('; ')
      points.push(`User requests: ${topics}`)
    }

    // Add tools used
    const toolsUsed = new Set<string>()
    for (const msg of assistantMessages) {
      if (msg.toolsUsed) {
        msg.toolsUsed.forEach((t) => toolsUsed.add(t))
      }
    }
    if (toolsUsed.size > 0) {
      points.push(`Tools used: ${Array.from(toolsUsed).join(', ')}`)
    }

    // Add timestamp range
    if (messages.length > 0) {
      const first = messages[0].timestamp
      const last = messages[messages.length - 1].timestamp
      points.push(`Time range: ${first} to ${last}`)
    }

    points.push(`Messages summarized: ${messages.length}`)

    return points.join('\n')
  }

  // ==================== Export/Import ====================

  async export(sessionId: string): Promise<SessionExport> {
    const session = await this.store.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const sessionWithSummary = session as Session & { longTermSummary?: string }

    const exported: SessionExport = {
      version: '1.0',
      exportedAt: Date.now(),
      session: {
        name: session.name,
        messages: session.messages,
        workDir: session.workDir,
        longTermSummary: sessionWithSummary.longTermSummary,
      },
    }

    log.info('Session exported', { sessionId, messageCount: session.messages.length })
    return exported
  }

  async import(data: SessionExport): Promise<Session> {
    // Validate export format
    if (data.version !== '1.0') {
      throw new Error(`Unsupported export version: ${data.version}`)
    }

    if (!data.session || !Array.isArray(data.session.messages)) {
      throw new Error('Invalid session export format')
    }

    // Create new session with imported data
    const session = await this.store.create(
      data.session.name || `Imported ${new Date().toLocaleString()}`,
      data.session.workDir
    )

    // Update with imported messages and metadata
    const imported: Session & { longTermSummary?: string } = {
      ...session,
      messages: data.session.messages,
      longTermSummary: data.session.longTermSummary,
    }

    await this.store.save(imported as Session)

    log.info('Session imported', {
      newSessionId: session.id,
      originalName: data.session.name,
      messageCount: data.session.messages.length,
    })

    return imported as Session
  }

  // ==================== Cleanup ====================

  async cleanupOldSessions(olderThanDays: number): Promise<{ deleted: number; failed: number }> {
    return this.store.cleanupOldSessions(olderThanDays)
  }

  // ==================== Helpers ====================

  private toMetadata(session: Session): SessionMetadata {
    const tokenEstimate = estimateSessionTokens(session.messages)
    const lastMessage = session.messages[session.messages.length - 1]
    const summary = lastMessage
      ? lastMessage.content.slice(0, 100)
      : 'No messages'

    return {
      id: session.id,
      name: session.name,
      createdAt: new Date(session.createdAt).getTime(),
      updatedAt: new Date(session.updatedAt).getTime(),
      messageCount: session.messages.length,
      tokenEstimate,
      summary,
    }
  }

  /**
   * Get the underlying store (for direct access when needed)
   */
  getStore(): SessionStore {
    return this.store
  }
}

import type { Session, Message, ClaudeConfig, ModelProvider, PersistedAgent } from '@shared/types'
import { APIError, NetworkError, AbortedError } from './errors'

export type { Session, Message, ClaudeConfig, ModelProvider, PersistedAgent }

const API_BASE = '/api'

const activeRequests = new Map<string, AbortController>()

function createAbortableRequest(key: string): AbortController {
  const existingController = activeRequests.get(key)
  if (existingController) {
    existingController.abort()
  }
  const controller = new AbortController()
  activeRequests.set(key, controller)
  return controller
}

function cleanupRequest(key: string): void {
  activeRequests.delete(key)
}

interface FetchOptions extends RequestInit {
  timeout?: number
}

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options
  const url = `${API_BASE}${endpoint}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const mergedSignal = options.signal
    ? combineSignals(options.signal, controller.signal)
    : controller.signal

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: mergedSignal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new APIError(response.status, endpoint, errorBody || response.statusText)
    }

    const text = await response.text()
    if (!text) return null as T

    return JSON.parse(text) as T
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof APIError) throw error

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new AbortedError(endpoint)
      }
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new NetworkError()
      }
    }

    throw error
  }
}

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort()
      break
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  return controller.signal
}

export interface ClaudeConfigItem {
  name: string
  description: string
  model?: string
  tools?: string[]
  triggers?: string[]
}

export async function getClaudeConfig(signal?: AbortSignal): Promise<ClaudeConfig> {
  const key = 'claude-config'
  const controller = createAbortableRequest(key)
  try {
    return await apiFetch<ClaudeConfig>('/claude-config', {
      signal: signal ?? controller.signal,
    })
  } catch (error) {
    if (error instanceof AbortedError) {
      return { agents: [], skills: [], commands: [] }
    }
    throw error
  } finally {
    cleanupRequest(key)
  }
}

interface SessionsResponse {
  sessions: Session[]
  total: number
}

export async function getSessions(signal?: AbortSignal): Promise<Session[]> {
  const key = 'sessions'
  const controller = createAbortableRequest(key)
  try {
    const response = await apiFetch<SessionsResponse>('/sessions', {
      signal: signal ?? controller.signal,
    })
    // API returns { sessions: [], total: N } - extract the array
    return Array.isArray(response?.sessions) ? response.sessions : []
  } catch (error) {
    if (error instanceof AbortedError) return []
    if (error instanceof APIError && error.isNotFound) return []
    throw error
  } finally {
    cleanupRequest(key)
  }
}

export async function createSession(data: { name?: string; workDir?: string }): Promise<Session> {
  return apiFetch<Session>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

interface SessionResponse {
  session: Session
}

export async function getSession(id: string, signal?: AbortSignal): Promise<Session | null> {
  const key = `session-${id}`
  const controller = createAbortableRequest(key)
  try {
    const response = await apiFetch<SessionResponse>(`/sessions/${id}`, {
      signal: signal ?? controller.signal,
    })
    return response.session
  } catch (error) {
    if (error instanceof AbortedError) return null
    if (error instanceof APIError && error.isNotFound) return null
    throw error
  } finally {
    cleanupRequest(key)
  }
}

export async function deleteSession(id: string): Promise<void> {
  await apiFetch<void>(`/sessions/${id}`, { method: 'DELETE' })
}

export async function deleteAllSessions(): Promise<{ deleted: number }> {
  return apiFetch<{ deleted: number }>('/sessions', { method: 'DELETE' })
}

export function createWebSocket(): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return new WebSocket(`${protocol}//${host}/ws`)
}

// Agent Registry API
export type AgentStatus = 'pending' | 'active' | 'completed' | 'failed' | 'deleted'
export type AgentType = 'scout' | 'architect' | 'builder' | 'reviewer' | 'general-purpose' | 'Explore' | 'Plan' | 'code-quality' | 'refactor-agent'

export interface Agent {
  id: string
  type: AgentType
  sessionId: string
  status: AgentStatus
  task: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  result?: string
  error?: string
  tokensUsed?: number
  parentAgentId?: string
}

export interface AgentMetrics {
  totalAgents: number
  activeAgents: number
  completedAgents: number
  failedAgents: number
  delegationRate: number
  avgDurationMs: number
  totalTokens: number
}

export interface AgentsResponse {
  agents: Agent[]
  metrics: AgentMetrics
}

export interface SessionAgentStats {
  sessionId: string
  agents: Agent[]
  metrics: AgentMetrics
}

const emptyMetrics: AgentMetrics = {
  totalAgents: 0,
  activeAgents: 0,
  completedAgents: 0,
  failedAgents: 0,
  delegationRate: 0,
  avgDurationMs: 0,
  totalTokens: 0,
}

export async function getAgents(): Promise<AgentsResponse> {
  try {
    return await apiFetch<AgentsResponse>('/agents')
  } catch {
    return { agents: [], metrics: emptyMetrics }
  }
}

export async function getSessionAgents(sessionId: string, signal?: AbortSignal): Promise<SessionAgentStats> {
  const key = `session-agents-${sessionId}`
  const controller = createAbortableRequest(key)
  const defaultStats: SessionAgentStats = { sessionId, agents: [], metrics: emptyMetrics }

  try {
    return await apiFetch<SessionAgentStats>(`/agents/session/${sessionId}`, {
      signal: signal ?? controller.signal,
    })
  } catch (error) {
    if (error instanceof AbortedError) return defaultStats
    if (error instanceof APIError && error.isNotFound) return defaultStats
    throw error
  } finally {
    cleanupRequest(key)
  }
}

export async function deleteAgent(id: string): Promise<void> {
  await apiFetch<void>(`/agents/${id}`, { method: 'DELETE' })
}

export async function clearSessionAgents(sessionId: string): Promise<{ deleted: number }> {
  return apiFetch<{ deleted: number }>(`/agents/session/${sessionId}`, { method: 'DELETE' })
}

// Memory System API
export interface MemoryFeedback {
  memoryId: string
  type: 'positive' | 'negative'
  context?: string
  sessionId?: string
}

export async function sendMemoryFeedback(data: MemoryFeedback): Promise<void> {
  await apiFetch<void>('/memory/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export interface MemorySearchResult {
  memory: {
    id: string
    content: string
    type: string
    confidence: number
    createdAt: string
  }
  score: number
  source: string
}

// Persisted Agents API (from session storage)
export async function getPersistedAgents(sessionId: string): Promise<PersistedAgent[]> {
  try {
    return await apiFetch<PersistedAgent[]>(`/sessions/${sessionId}/agents`)
  } catch {
    return []
  }
}

// Learning Loop API
export interface LearningStats {
  totalExecutions: number
  executionsByExpert: Record<string, number>
  successRate: number
}

export interface LearningConfig {
  autoLearnEnabled: boolean
  stats: LearningStats
}

export interface LearningHistoryItem {
  agentId: string
  agentType: string
  sessionId: string
  success: boolean
  toolCalls: number
  durationMs: number
}

export interface LearningHistory {
  expertId: string
  history: LearningHistoryItem[]
}

const emptyLearningStats: LearningStats = {
  totalExecutions: 0,
  executionsByExpert: {},
  successRate: 0,
}

export async function getLearningStats(): Promise<LearningStats> {
  try {
    return await apiFetch<LearningStats>('/learning/stats')
  } catch {
    return emptyLearningStats
  }
}

export async function getLearningConfig(): Promise<LearningConfig> {
  try {
    return await apiFetch<LearningConfig>('/learning/config')
  } catch {
    return { autoLearnEnabled: true, stats: emptyLearningStats }
  }
}

export async function setLearningConfig(config: { autoLearnEnabled?: boolean }): Promise<boolean> {
  const data = await apiFetch<{ success: boolean }>('/learning/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return data.success === true
}

export async function getLearningHistory(expertId: string): Promise<LearningHistory> {
  try {
    return await apiFetch<LearningHistory>(`/learning/history/${expertId}`)
  } catch {
    return { expertId, history: [] }
  }
}

// Experts API
export interface ExpertInfo {
  id: string
  domain: string
  confidence: number
}

export interface ExpertDetail {
  expertise: {
    domain: string
    version: string
    last_updated: string
    confidence: number
    mental_model: {
      overview: string
      key_files: Array<{ path: string; purpose: string }>
    }
    patterns?: Array<{ name: string; confidence: number; usage?: string }>
    known_issues?: Array<{ id: string; symptom: string; solution: string; verified: boolean }>
    changelog?: Array<{ date: string; type: string; change: string }>
  }
  validation: {
    valid: boolean
    errors: string[]
    warnings: string[]
  }
  hasAgentPrompt: boolean
}

export async function getExperts(): Promise<ExpertInfo[]> {
  try {
    const data = await apiFetch<{ experts: ExpertInfo[] }>('/experts')
    return data.experts
  } catch {
    return []
  }
}

export async function getExpert(id: string): Promise<ExpertDetail | null> {
  try {
    return await apiFetch<ExpertDetail>(`/experts/${id}`)
  } catch (error) {
    if (error instanceof APIError && error.isNotFound) return null
    throw error
  }
}

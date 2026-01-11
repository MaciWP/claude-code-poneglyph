import { logger } from '../../logger'
import { memoryStore } from './store'
import { memoryGraph } from './graph'
import { getAgentMemorySpace, getAgentPatterns } from './agent-memory'
import type { Memory, MemorySearchResult, AgentType, MemoryPattern } from './types'

const log = logger.child('shared-knowledge')

export interface SharedKnowledge {
  id: string
  content: string
  sourceAgents: AgentType[]
  confidence: number
  usageCount: number
  createdAt: string
}

const sharedKnowledge: Map<string, SharedKnowledge> = new Map()

export async function promoteToShared(memoryId: string): Promise<SharedKnowledge | null> {
  const memory = await memoryStore.get(memoryId)
  if (!memory) return null

  const existing = findSimilarShared(memory.content)
  if (existing) {
    existing.usageCount++
    if (memory.metadata.agentType && !existing.sourceAgents.includes(memory.metadata.agentType)) {
      existing.sourceAgents.push(memory.metadata.agentType)
    }
    return existing
  }

  const knowledge: SharedKnowledge = {
    id: `shared_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    content: memory.content,
    sourceAgents: memory.metadata.agentType ? [memory.metadata.agentType] : [],
    confidence: memory.confidence.current,
    usageCount: 1,
    createdAt: new Date().toISOString()
  }

  sharedKnowledge.set(knowledge.id, knowledge)
  log.info('Promoted to shared knowledge', { memoryId, sharedId: knowledge.id })

  return knowledge
}

function findSimilarShared(content: string): SharedKnowledge | null {
  const contentLower = content.toLowerCase()

  for (const knowledge of sharedKnowledge.values()) {
    const knowledgeLower = knowledge.content.toLowerCase()
    const similarity = calculateJaccard(contentLower, knowledgeLower)
    if (similarity > 0.7) {
      return knowledge
    }
  }

  return null
}

function calculateJaccard(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/))
  const setB = new Set(b.split(/\s+/))

  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])

  return union.size > 0 ? intersection.size / union.size : 0
}

export async function searchSharedKnowledge(
  query: string,
  options: { limit?: number; minConfidence?: number } = {}
): Promise<SharedKnowledge[]> {
  const queryLower = query.toLowerCase()
  const results: { knowledge: SharedKnowledge; score: number }[] = []

  for (const knowledge of sharedKnowledge.values()) {
    if (options.minConfidence && knowledge.confidence < options.minConfidence) continue

    const contentLower = knowledge.content.toLowerCase()
    if (contentLower.includes(queryLower)) {
      const score = calculateJaccard(queryLower, contentLower) * knowledge.confidence
      results.push({ knowledge, score })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, options.limit ?? 5).map(r => r.knowledge)
}

export async function detectCrossAgentPatterns(): Promise<MemoryPattern[]> {
  const agentTypes: AgentType[] = ['Explore', 'Plan', 'general-purpose', 'code-quality', 'builder', 'reviewer']
  const patternCounts: Map<string, { count: number; agents: Set<AgentType> }> = new Map()

  for (const agentType of agentTypes) {
    const patterns = await getAgentPatterns(agentType)

    for (const { pattern, count } of patterns) {
      const existing = patternCounts.get(pattern)
      if (existing) {
        existing.count += count
        existing.agents.add(agentType)
      } else {
        patternCounts.set(pattern, { count, agents: new Set([agentType]) })
      }
    }
  }

  const crossAgentPatterns: MemoryPattern[] = []

  for (const [pattern, data] of patternCounts.entries()) {
    if (data.agents.size >= 2) {
      crossAgentPatterns.push({
        id: `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        pattern,
        frequency: data.count,
        memories: [],
        confidence: Math.min(1, data.count / 10),
        abstracted: false
      })
    }
  }

  log.info('Detected cross-agent patterns', { count: crossAgentPatterns.length })
  return crossAgentPatterns.sort((a, b) => b.frequency - a.frequency)
}

export async function syncAgentKnowledge(
  sourceAgent: AgentType,
  targetAgent: AgentType,
  options: { minConfidence?: number; limit?: number } = {}
): Promise<Memory[]> {
  const sourceSpace = await getAgentMemorySpace(sourceAgent)

  const relevantMemories = sourceSpace.memories
    .filter(m => m.confidence.current >= (options.minConfidence ?? 0.6))
    .sort((a, b) => b.confidence.current - a.confidence.current)
    .slice(0, options.limit ?? 10)

  const synced: Memory[] = []

  for (const memory of relevantMemories) {
    const copy = await memoryStore.add(
      memory.content,
      memory.type,
      'inferred',
      {
        agentType: targetAgent,
        tags: [...memory.metadata.tags, `synced_from_${sourceAgent}`],
        initialConfidence: memory.confidence.current * 0.8
      }
    )

    await memoryGraph.addEdge(memory.id, copy.id, 'derived_from', 0.8)
    synced.push(copy)
  }

  log.info('Synced knowledge between agents', {
    sourceAgent,
    targetAgent,
    count: synced.length
  })

  return synced
}

export function getSharedKnowledgeStats(): {
  total: number
  avgConfidence: number
  topAgents: { agent: AgentType; count: number }[]
} {
  const agentCounts: Map<AgentType, number> = new Map()
  let totalConfidence = 0

  for (const knowledge of sharedKnowledge.values()) {
    totalConfidence += knowledge.confidence
    for (const agent of knowledge.sourceAgents) {
      agentCounts.set(agent, (agentCounts.get(agent) ?? 0) + 1)
    }
  }

  const topAgents = Array.from(agentCounts.entries())
    .map(([agent, count]) => ({ agent, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total: sharedKnowledge.size,
    avgConfidence: sharedKnowledge.size > 0 ? totalConfidence / sharedKnowledge.size : 0,
    topAgents
  }
}

export function getAllSharedKnowledge(): SharedKnowledge[] {
  return Array.from(sharedKnowledge.values())
}

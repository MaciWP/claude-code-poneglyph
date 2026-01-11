import type { Memory, MemorySearchResult, MemoryLaneType, MEMORY_LANE_PRIORITY } from './types'

export interface RankedMemory {
  memory: Memory
  similarity: number
  relevanceScore: number
  feedbackScore: number
  finalScore: number
}

const LANE_WEIGHTS: Record<string, number> = {
  correction: 1.3,
  decision: 1.2,
  commitment: 1.2,
  insight: 1.1,
  learning: 1.1,
  confidence: 1.0,
  pattern_seed: 0.9,
  cross_agent: 0.9,
  workflow_note: 0.8,
  gap: 0.8
}

export function getAdaptiveSimilarityFloor(
  hasRecentContext: boolean,
  isHighPriority: boolean
): number {
  let floor = 0.3

  if (hasRecentContext) {
    floor -= 0.05
  }

  if (isHighPriority) {
    floor -= 0.05
  }

  return Math.max(0.15, floor)
}

function calculateFeedbackScore(
  memoryId: string,
  feedbackHistory: Map<string, number>
): number {
  const feedback = feedbackHistory.get(memoryId) || 0
  return Math.tanh(feedback * 0.1)
}

function calculateLaneWeight(laneType?: MemoryLaneType): number {
  if (!laneType) return 1.0
  return LANE_WEIGHTS[laneType] || 1.0
}

function calculateConfidenceWeight(memory: Memory): number {
  const confidence = memory.confidence.current
  return 0.5 + (confidence * 0.5)
}

function calculateRecencyWeight(memory: Memory): number {
  const lastAccessed = new Date(memory.confidence.lastAccessed).getTime()
  const now = Date.now()
  const daysSinceAccess = (now - lastAccessed) / (1000 * 60 * 60 * 24)

  if (daysSinceAccess < 1) return 1.0
  if (daysSinceAccess < 7) return 0.9
  if (daysSinceAccess < 30) return 0.8
  return 0.7
}

export async function rankMemories(
  _query: string,
  candidates: MemorySearchResult[],
  feedbackHistory: Map<string, number>
): Promise<RankedMemory[]> {
  const ranked: RankedMemory[] = candidates.map(candidate => {
    const { memory, similarity, relevanceScore } = candidate

    const feedbackScore = calculateFeedbackScore(memory.id, feedbackHistory)
    const laneWeight = calculateLaneWeight(memory.laneType)
    const confidenceWeight = calculateConfidenceWeight(memory)
    const recencyWeight = calculateRecencyWeight(memory)

    const finalScore =
      similarity * 0.4 +
      relevanceScore * 0.2 +
      feedbackScore * 0.1 +
      (laneWeight - 1) * 0.15 +
      confidenceWeight * 0.1 +
      recencyWeight * 0.05

    return {
      memory,
      similarity,
      relevanceScore,
      feedbackScore,
      finalScore
    }
  })

  ranked.sort((a, b) => b.finalScore - a.finalScore)

  return ranked
}

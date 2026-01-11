export type MemoryType = 'semantic' | 'episodic' | 'procedural'
export type MemorySource = 'explicit' | 'inferred' | 'interaction' | 'feedback'
export type AgentType = 'Explore' | 'Plan' | 'general-purpose' | 'code-quality' | 'refactor-agent' | 'builder' | 'reviewer'

export type MemoryLaneType =
  | 'correction'
  | 'decision'
  | 'commitment'
  | 'insight'
  | 'learning'
  | 'confidence'
  | 'pattern_seed'
  | 'cross_agent'
  | 'workflow_note'
  | 'gap'

export const MEMORY_LANE_PRIORITY: Record<MemoryLaneType, 'high' | 'medium' | 'lower'> = {
  correction: 'high',
  decision: 'high',
  commitment: 'high',
  insight: 'medium',
  learning: 'medium',
  confidence: 'medium',
  pattern_seed: 'lower',
  cross_agent: 'lower',
  workflow_note: 'lower',
  gap: 'lower'
}

export interface ConfidenceMetrics {
  initial: number
  current: number
  decayRate: number
  reinforcements: number
  contradictions: number
  lastAccessed: string
}

export interface MemoryMetadata {
  source: MemorySource
  sessionId?: string
  agentType?: AgentType
  extractedFrom?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Memory {
  id: string
  type: MemoryType
  content: string
  embedding?: number[]
  confidence: ConfidenceMetrics
  metadata: MemoryMetadata
  relatedMemories?: string[]
  laneType?: MemoryLaneType
  observationCount?: number
  lastObserved?: string
  sourceChunk?: string
  reasoning?: string
  title?: string
}

export interface MemorySearchResult {
  memory: Memory
  similarity: number
  relevanceScore: number
}

export interface ActiveLearningTrigger {
  type: 'low_confidence' | 'contradiction' | 'new_pattern' | 'clarification_needed'
  memoryId?: string
  question: string
  options: string[]
  context: string
}

export interface FeedbackEvent {
  type: 'positive' | 'negative' | 'correction'
  memoryId?: string
  responseId: string
  sessionId: string
  content?: string
  timestamp: string
}

export interface MemoryPattern {
  id: string
  pattern: string
  frequency: number
  memories: string[]
  confidence: number
  abstracted: boolean
}

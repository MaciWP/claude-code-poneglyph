import { logger } from '../../logger'
import { memoryStore } from './store'
import { generateEmbedding } from './vector'
import type { Memory, MemoryType, AgentType, MemoryLaneType } from './types'

const log = logger.child('memory-extractor')

export interface ExtractionResult {
  content: string
  type: MemoryType
  confidence: number
  tags: string[]
  reason: string
  laneType?: MemoryLaneType
  title?: string
  sourceChunk?: string
}

interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

const PREFERENCE_PATTERNS = [
  { pattern: /(?:i\s+)?prefer\s+(.+?)(?:\.|$)/i, type: 'preference' as const },
  { pattern: /(?:i\s+)?like\s+(?:to\s+)?(.+?)(?:\.|$)/i, type: 'preference' as const },
  { pattern: /(?:don't|do\s+not)\s+(?:use|like)\s+(.+?)(?:\.|$)/i, type: 'anti-preference' as const },
  { pattern: /always\s+(?:use|do)\s+(.+?)(?:\.|$)/i, type: 'preference' as const },
  { pattern: /never\s+(?:use|do)\s+(.+?)(?:\.|$)/i, type: 'anti-preference' as const }
]

const KNOWLEDGE_PATTERNS = [
  { pattern: /(?:the\s+)?project\s+(?:uses?|has)\s+(.+?)(?:\.|$)/i, type: 'project' as const },
  { pattern: /(?:we|i)\s+use\s+(.+?)\s+for\s+(.+?)(?:\.|$)/i, type: 'stack' as const },
  { pattern: /(?:the\s+)?(?:database|db)\s+is\s+(.+?)(?:\.|$)/i, type: 'infrastructure' as const },
  { pattern: /(?:deploy|run)\s+(?:on|to)\s+(.+?)(?:\.|$)/i, type: 'infrastructure' as const }
]

const FEEDBACK_PATTERNS = [
  { pattern: /(?:that's\s+)?(?:correct|right|exactly)/i, type: 'positive' as const },
  { pattern: /(?:no,?\s+)?(?:that's\s+)?(?:wrong|incorrect)/i, type: 'negative' as const },
  { pattern: /(?:actually|instead),?\s+(.+)/i, type: 'correction' as const }
]

export interface SurprisePattern {
  name: string
  patterns: RegExp[]
  memoryType: MemoryType
  laneType: MemoryLaneType
  confidenceBoost: number
  role: 'user' | 'assistant' | 'both'
}

export const SURPRISE_PATTERNS: SurprisePattern[] = [
  {
    name: 'recovery',
    patterns: [
      /(?:I|we)\s+fixed\s+(?:the|this)\s+issue/i,
      /that\s+worked/i,
      /problem\s+solved/i,
      /now\s+it(?:'s)?\s+working/i,
      /finally\s+(?:got\s+it|works)/i
    ],
    memoryType: 'episodic',
    laneType: 'learning',
    confidenceBoost: 0.2,
    role: 'both'
  },
  {
    name: 'user_correction',
    patterns: [
      /no,?\s*(?:instead|actually|use|don't)/i,
      /that's\s+not\s+(?:what|how|right)/i,
      /don't\s+(?:do\s+)?that/i,
      /(?:please\s+)?(?:change|modify|fix)\s+(?:it|this|that)\s+to/i,
      /wrong[,.]?\s+(?:it\s+should|use)/i
    ],
    memoryType: 'semantic',
    laneType: 'correction',
    confidenceBoost: 0.3,
    role: 'user'
  },
  {
    name: 'enthusiasm',
    patterns: [
      /(?:that's\s+)?(?:perfect|exactly\s+what\s+I\s+(?:wanted|needed))/i,
      /(?:this\s+is\s+)?(?:great|awesome|excellent)/i,
      /(?:love|like)\s+(?:it|this|that)/i,
      /(?:yes|yeah)[!,]\s*(?:that's|this\s+is)/i
    ],
    memoryType: 'episodic',
    laneType: 'confidence',
    confidenceBoost: 0.15,
    role: 'user'
  },
  {
    name: 'negative_reaction',
    patterns: [
      /(?:this\s+is\s+)?(?:wrong|broken|not\s+working)/i,
      /(?:don't|never)\s+do\s+(?:this|that)\s+again/i,
      /(?:that's\s+)?(?:terrible|awful|bad)/i,
      /(?:please\s+)?stop\s+doing/i
    ],
    memoryType: 'semantic',
    laneType: 'correction',
    confidenceBoost: 0.25,
    role: 'user'
  },
  {
    name: 'decision',
    patterns: [
      /(?:I|we)\s+(?:decided|chose|picked)\s+(?:to\s+)?/i,
      /(?:let's|we'll)\s+(?:go\s+with|use)\s+/i,
      /(?:the\s+)?decision\s+(?:is|was)\s+(?:to\s+)?/i,
      /(?:I|we)\s+(?:will|want\s+to)\s+(?:use|go\s+with)/i
    ],
    memoryType: 'semantic',
    laneType: 'decision',
    confidenceBoost: 0.2,
    role: 'both'
  },
  {
    name: 'commitment',
    patterns: [
      /(?:always|usually)\s+(?:use|do|prefer)/i,
      /(?:my|our)\s+(?:standard|default|preferred)\s+(?:is|approach)/i,
      /(?:I|we)\s+(?:always|never)\s+/i,
      /(?:from\s+now\s+on|going\s+forward),?\s+(?:we|I)\s+(?:will|should)/i
    ],
    memoryType: 'semantic',
    laneType: 'commitment',
    confidenceBoost: 0.2,
    role: 'user'
  },
  {
    name: 'insight',
    patterns: [
      /(?:I|we)\s+(?:realized|discovered|found\s+out)/i,
      /(?:it\s+)?turns\s+out\s+(?:that\s+)?/i,
      /(?:the\s+)?(?:key|trick|secret)\s+(?:is|was)/i,
      /(?:interesting|surprisingly),?\s+/i
    ],
    memoryType: 'semantic',
    laneType: 'insight',
    confidenceBoost: 0.15,
    role: 'both'
  },
  {
    name: 'gap',
    patterns: [
      /(?:we\s+)?(?:need|should\s+add|missing)\s+/i,
      /(?:there's\s+)?no\s+(?:way\s+to|support\s+for)/i,
      /(?:it\s+)?(?:doesn't|can't)\s+(?:handle|support)/i,
      /(?:TODO|FIXME|HACK):/i
    ],
    memoryType: 'semantic',
    laneType: 'gap',
    confidenceBoost: 0.1,
    role: 'both'
  },
  {
    name: 'workflow',
    patterns: [
      /(?:the\s+)?(?:process|workflow|procedure)\s+(?:is|should\s+be)/i,
      /(?:step\s+\d+|first|then|finally)[,:]\s+/i,
      /(?:when|before|after)\s+(?:doing|running|executing)/i
    ],
    memoryType: 'procedural',
    laneType: 'workflow_note',
    confidenceBoost: 0.1,
    role: 'both'
  }
]

export function extractSurpriseMemories(
  text: string,
  role: 'user' | 'assistant',
  context?: string
): ExtractionResult[] {
  const results: ExtractionResult[] = []

  for (const surprise of SURPRISE_PATTERNS) {
    if (surprise.role !== 'both' && surprise.role !== role) {
      continue
    }

    for (const pattern of surprise.patterns) {
      const match = text.match(pattern)
      if (match) {
        const matchedText = match[0]
        const startIndex = Math.max(0, text.indexOf(matchedText) - 100)
        const endIndex = Math.min(text.length, text.indexOf(matchedText) + matchedText.length + 200)
        const sourceChunk = text.slice(startIndex, endIndex)

        const title = text.slice(
          Math.max(0, text.indexOf(matchedText) - 20),
          Math.min(text.length, text.indexOf(matchedText) + matchedText.length + 50)
        ).trim()

        results.push({
          content: sourceChunk,
          type: surprise.memoryType,
          laneType: surprise.laneType,
          confidence: 0.6 + surprise.confidenceBoost,
          tags: ['surprise', surprise.name, surprise.laneType],
          reason: `Surprise trigger: ${surprise.name} (pattern: ${pattern.source.slice(0, 30)}...)`,
          title: title.length > 100 ? title.slice(0, 100) + '...' : title,
          sourceChunk
        })

        break
      }
    }
  }

  return results
}

export async function extractFromConversation(
  turns: ConversationTurn[],
  options: {
    sessionId?: string
    agentType?: AgentType
    generateEmbeddings?: boolean
  } = {}
): Promise<Memory[]> {
  const extracted: Memory[] = []

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]
    const previousTurn = i > 0 ? turns[i - 1] : null

    const results = extractFromText(turn.content, turn.role, previousTurn?.content)

    for (const result of results) {
      let embedding: number[] | undefined

      if (options.generateEmbeddings) {
        try {
          embedding = await generateEmbedding(result.content)
        } catch (error) {
          log.warn('Failed to generate embedding', { error })
        }
      }

      const memory = await memoryStore.add(
        result.content,
        result.type,
        'interaction',
        {
          embedding,
          tags: result.tags,
          sessionId: options.sessionId,
          agentType: options.agentType,
          initialConfidence: result.confidence,
          laneType: result.laneType,
          title: result.title,
          sourceChunk: result.sourceChunk,
          reasoning: result.reason
        }
      )

      extracted.push(memory)
      log.debug('Extracted memory', {
        id: memory.id,
        type: result.type,
        reason: result.reason
      })
    }
  }

  log.info('Extraction complete', { count: extracted.length })
  return extracted
}

export function extractFromText(
  text: string,
  role: 'user' | 'assistant',
  previousContent?: string
): ExtractionResult[] {
  const results: ExtractionResult[] = []

  if (role === 'user') {
    for (const { pattern, type } of PREFERENCE_PATTERNS) {
      const match = text.match(pattern)
      if (match) {
        results.push({
          content: type === 'anti-preference'
            ? `User does NOT want: ${match[1]}`
            : `User prefers: ${match[1]}`,
          type: 'semantic',
          confidence: 0.7,
          tags: ['preference', type],
          reason: `Matched preference pattern: ${pattern.source.slice(0, 30)}...`
        })
      }
    }

    for (const { pattern, type } of KNOWLEDGE_PATTERNS) {
      const match = text.match(pattern)
      if (match) {
        const content = match[2]
          ? `${match[1]} is used for ${match[2]}`
          : `Project uses ${match[1]}`

        results.push({
          content,
          type: 'semantic',
          confidence: 0.8,
          tags: ['knowledge', type],
          reason: `Matched knowledge pattern: ${pattern.source.slice(0, 30)}...`
        })
      }
    }

    if (previousContent) {
      for (const { pattern, type } of FEEDBACK_PATTERNS) {
        const match = text.match(pattern)
        if (match) {
          if (type === 'positive') {
            results.push({
              content: `Confirmed: ${previousContent.slice(0, 200)}`,
              type: 'episodic',
              confidence: 0.9,
              tags: ['feedback', 'confirmation'],
              reason: 'User confirmed previous response'
            })
          } else if (type === 'correction' && match[1]) {
            results.push({
              content: `Correction: ${match[1]}`,
              type: 'semantic',
              confidence: 0.85,
              tags: ['feedback', 'correction'],
              reason: 'User provided correction'
            })
          }
        }
      }
    }
  }

  if (role === 'assistant') {
    const codeBlockMatch = text.match(/```(\w+)?\n([\s\S]*?)```/g)
    if (codeBlockMatch && codeBlockMatch.length > 0) {
      const language = text.match(/```(\w+)/)?.[1] || 'code'
      results.push({
        content: `Generated ${language} code pattern`,
        type: 'procedural',
        confidence: 0.5,
        tags: ['code', language],
        reason: 'Detected code generation'
      })
    }
  }

  return results
}

export function extractTags(text: string): string[] {
  const tags: string[] = []

  const techPatterns = [
    /\b(typescript|javascript|python|rust|go)\b/gi,
    /\b(react|vue|angular|svelte)\b/gi,
    /\b(node|bun|deno)\b/gi,
    /\b(postgres|mysql|mongodb|redis)\b/gi,
    /\b(docker|kubernetes|aws|gcp|azure)\b/gi
  ]

  for (const pattern of techPatterns) {
    const matches = text.match(pattern)
    if (matches) {
      tags.push(...matches.map(m => m.toLowerCase()))
    }
  }

  return [...new Set(tags)]
}

export async function extractExplicitMemory(
  instruction: string,
  options: {
    sessionId?: string
    agentType?: AgentType
  } = {}
): Promise<Memory> {
  const tags = extractTags(instruction)

  let embedding: number[] | undefined
  try {
    embedding = await generateEmbedding(instruction)
  } catch (error) {
    log.warn('Failed to generate embedding for explicit memory')
  }

  const memory = await memoryStore.add(
    instruction,
    'semantic',
    'explicit',
    {
      embedding,
      tags: ['explicit', ...tags],
      sessionId: options.sessionId,
      agentType: options.agentType,
      initialConfidence: 0.9
    }
  )

  log.info('Created explicit memory', { id: memory.id })
  return memory
}

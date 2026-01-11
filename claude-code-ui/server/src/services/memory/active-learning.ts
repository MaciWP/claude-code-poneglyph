import { logger } from '../../logger'
import { memoryStore } from './store'
import { memoryGraph } from './graph'
import { shouldTriggerValidation } from './confidence'
import type { ActiveLearningTrigger, FeedbackEvent } from './types'

const log = logger.child('active-learning')

export interface ActiveLearningConfig {
  lowConfidenceThreshold: number
  contradictionCheckInterval: number
  maxQuestionsPerSession: number
  cooldownMinutes: number
}

const DEFAULT_CONFIG: ActiveLearningConfig = {
  lowConfidenceThreshold: 0.4,
  contradictionCheckInterval: 10,
  maxQuestionsPerSession: 3,
  cooldownMinutes: 30
}

const sessionQuestionCounts: Map<string, { count: number; lastAsked: Date }> = new Map()

export async function checkForTriggers(
  sessionId: string,
  context: string,
  config: ActiveLearningConfig = DEFAULT_CONFIG
): Promise<ActiveLearningTrigger[]> {
  const triggers: ActiveLearningTrigger[] = []

  const sessionState = sessionQuestionCounts.get(sessionId)
  if (sessionState) {
    const minutesSinceLastQuestion =
      (Date.now() - sessionState.lastAsked.getTime()) / (1000 * 60)

    if (
      sessionState.count >= config.maxQuestionsPerSession &&
      minutesSinceLastQuestion < config.cooldownMinutes
    ) {
      return []
    }
  }

  const lowConfidenceTrigger = await checkLowConfidence(context, config)
  if (lowConfidenceTrigger) {
    triggers.push(lowConfidenceTrigger)
  }

  const contradictionTrigger = await checkContradictions(context)
  if (contradictionTrigger) {
    triggers.push(contradictionTrigger)
  }

  const patternTrigger = await checkNewPatterns(context)
  if (patternTrigger) {
    triggers.push(patternTrigger)
  }

  return triggers
}

async function checkLowConfidence(
  context: string,
  _config: ActiveLearningConfig
): Promise<ActiveLearningTrigger | null> {
  const allMemories = await memoryStore.getAll()

  const relevantLowConfidence = allMemories.filter(m => {
    const isRelevant = m.content.toLowerCase().includes(context.toLowerCase().slice(0, 50))
    const needsValidation = shouldTriggerValidation(m.confidence)
    return isRelevant && needsValidation
  })

  if (relevantLowConfidence.length === 0) return null

  const memory = relevantLowConfidence[0]

  return {
    type: 'low_confidence',
    memoryId: memory.id,
    question: `I remember that "${memory.content.slice(0, 100)}..." - is this still accurate?`,
    options: ['Yes, that\'s correct', 'No, that\'s outdated', 'Partially correct'],
    context: memory.content
  }
}

async function checkContradictions(
  context: string
): Promise<ActiveLearningTrigger | null> {
  const searchResults = await memoryStore.search(context, { limit: 10 })

  for (const result of searchResults) {
    const contradictions = await memoryGraph.findContradictions(result.memory.id)
    if (contradictions.length > 0) {
      const contradictingMemory = await memoryStore.get(contradictions[0])
      if (contradictingMemory) {
        return {
          type: 'contradiction',
          memoryId: result.memory.id,
          question: `I have conflicting information: "${result.memory.content.slice(0, 80)}..." vs "${contradictingMemory.content.slice(0, 80)}..." - which is correct?`,
          options: ['First one', 'Second one', 'Both are valid in different contexts', 'Neither'],
          context: `${result.memory.content}\n---\n${contradictingMemory.content}`
        }
      }
    }
  }

  return null
}

async function checkNewPatterns(
  context: string
): Promise<ActiveLearningTrigger | null> {
  const searchResults = await memoryStore.search(context, { limit: 5 })

  const recentPatterns = searchResults.filter(r => {
    const created = new Date(r.memory.metadata.createdAt)
    const hoursSinceCreated = (Date.now() - created.getTime()) / (1000 * 60 * 60)
    return hoursSinceCreated < 24 && r.memory.confidence.reinforcements === 0
  })

  if (recentPatterns.length >= 2) {
    return {
      type: 'new_pattern',
      question: 'I\'ve noticed a new pattern in your requests. Should I remember this preference going forward?',
      options: ['Yes, remember this', 'No, it was just for now', 'Ask me again later'],
      context: recentPatterns.map(r => r.memory.content).join('\n')
    }
  }

  return null
}

export async function processFeedback(
  feedback: FeedbackEvent
): Promise<void> {
  log.info('Processing feedback', { type: feedback.type, memoryId: feedback.memoryId })

  if (feedback.memoryId) {
    if (feedback.type === 'positive') {
      await memoryStore.reinforce(feedback.memoryId)
    } else if (feedback.type === 'negative') {
      await memoryStore.contradict(feedback.memoryId)
    } else if (feedback.type === 'correction' && feedback.content) {
      await memoryStore.contradict(feedback.memoryId)

      const original = await memoryStore.get(feedback.memoryId)
      if (original) {
        const corrected = await memoryStore.add(
          feedback.content,
          original.type,
          'feedback',
          {
            tags: [...original.metadata.tags, 'corrected'],
            sessionId: feedback.sessionId,
            initialConfidence: 0.85
          }
        )

        await memoryGraph.addEdge(corrected.id, feedback.memoryId, 'supersedes', 1.0)
      }
    }
  }

  updateSessionQuestionCount(feedback.sessionId)
}

function updateSessionQuestionCount(sessionId: string): void {
  const current = sessionQuestionCounts.get(sessionId)
  if (current) {
    current.count++
    current.lastAsked = new Date()
  } else {
    sessionQuestionCounts.set(sessionId, { count: 1, lastAsked: new Date() })
  }
}

export async function handleActiveLearningResponse(
  trigger: ActiveLearningTrigger,
  responseIndex: number,
  sessionId: string
): Promise<void> {
  log.info('Handling active learning response', {
    type: trigger.type,
    responseIndex
  })

  switch (trigger.type) {
    case 'low_confidence':
      if (trigger.memoryId) {
        if (responseIndex === 0) {
          await memoryStore.reinforce(trigger.memoryId)
        } else if (responseIndex === 1) {
          await memoryStore.contradict(trigger.memoryId)
        }
      }
      break

    case 'contradiction':
      if (trigger.memoryId) {
        const contradictions = await memoryGraph.findContradictions(trigger.memoryId)
        if (contradictions.length > 0) {
          if (responseIndex === 0) {
            await memoryStore.reinforce(trigger.memoryId)
            await memoryStore.contradict(contradictions[0])
          } else if (responseIndex === 1) {
            await memoryStore.contradict(trigger.memoryId)
            await memoryStore.reinforce(contradictions[0])
          } else if (responseIndex === 3) {
            await memoryStore.contradict(trigger.memoryId)
            await memoryStore.contradict(contradictions[0])
          }
        }
      }
      break

    case 'new_pattern':
      if (responseIndex === 0) {
        const memories = await memoryStore.search(trigger.context, { limit: 3 })
        for (const result of memories) {
          await memoryStore.reinforce(result.memory.id)
        }
      }
      break
  }

  updateSessionQuestionCount(sessionId)
}

export function resetSessionState(sessionId: string): void {
  sessionQuestionCounts.delete(sessionId)
}

export function getSessionStats(sessionId: string): {
  questionsAsked: number
  lastAsked: Date | null
  canAskMore: boolean
} {
  const state = sessionQuestionCounts.get(sessionId)

  if (!state) {
    return {
      questionsAsked: 0,
      lastAsked: null,
      canAskMore: true
    }
  }

  const minutesSinceLastQuestion =
    (Date.now() - state.lastAsked.getTime()) / (1000 * 60)

  const canAskMore =
    state.count < DEFAULT_CONFIG.maxQuestionsPerSession ||
    minutesSinceLastQuestion >= DEFAULT_CONFIG.cooldownMinutes

  return {
    questionsAsked: state.count,
    lastAsked: state.lastAsked,
    canAskMore
  }
}

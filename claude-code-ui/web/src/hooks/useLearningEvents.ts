import { useState, useCallback } from 'react'

export interface LearningChange {
  type: 'pattern' | 'issue' | 'file' | 'confidence'
  description: string
  data?: unknown
}

export interface LearningEvent {
  type: 'learning:started' | 'learning:completed' | 'learning:failed'
  expertId: string
  agentId?: string
  changes?: LearningChange[]
  newConfidence?: number
  error?: string
}

export function useLearningEvents() {
  const [events, setEvents] = useState<LearningEvent[]>([])

  const addEvent = useCallback((event: LearningEvent) => {
    setEvents(prev => [event, ...prev])
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return { events, addEvent, clearEvents }
}

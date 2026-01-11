import { memo } from 'react'
import type { LogEntry } from '../../../types/chat'
import AgentResultCard from '../AgentResultCard'

interface TaskToolInput {
  subagent_type?: string
  prompt?: string
  description?: string
  model?: string
}

interface TaskToolViewProps {
  entry: LogEntry
  activeAgent?: string
}

export default memo(function TaskToolView({ entry, activeAgent }: TaskToolViewProps) {
  const input = entry.toolInput as TaskToolInput | undefined
  const agentType = input?.subagent_type || 'unknown'
  const prompt = input?.prompt || ''
  const title = input?.description || (prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt)

  // Use explicit agentStatus/agentError instead of string parsing
  const hasError = entry.agentStatus === 'failed' || entry.agentError !== undefined
  const errorMessage = entry.agentError || (hasError ? entry.toolOutput : undefined)

  // Use entry.agentUuid for display, fallback to toolUseId
  const agentId = entry.agentUuid || entry.toolUseId

  return (
    <div className={`py-2 border-b border-surface-tertiary last:border-0 ${activeAgent ? 'ml-4 border-l-2 border-orange-500/30 pl-3' : ''}`}>
      <AgentResultCard
        agentType={agentType}
        prompt={prompt}
        title={title}
        result={hasError ? undefined : entry.toolOutput}
        error={errorMessage}
        timestamp={entry.timestamp}
        model={input?.model}
        agentId={agentId}
        agentTools={entry.agentTools}
        agentSteps={entry.agentSteps}
        agentStartTime={entry.agentStartTime}
        agentStatus={entry.agentStatus}
      />
    </div>
  )
})

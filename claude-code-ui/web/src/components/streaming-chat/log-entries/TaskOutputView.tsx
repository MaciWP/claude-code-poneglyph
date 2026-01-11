import type { LogEntry } from '../../../types/chat'
import AgentResultCard from '../AgentResultCard'

interface TaskOutputViewProps {
  entry: LogEntry
}

export default function TaskOutputView({ entry }: TaskOutputViewProps) {
  const hasEmptyOutput = !entry.toolOutput || entry.toolOutput.trim() === '' || entry.toolOutput.includes('not_ready')
  const hasError = entry.toolOutput?.includes('API Error')

  // Show waiting state for not_ready
  if (entry.toolOutput?.includes('not_ready')) {
    return (
      <div className="py-1">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded px-3 py-2 text-xs text-orange-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          <span>Agent still working...</span>
        </div>
      </div>
    )
  }

  if (hasEmptyOutput) {
    return null // Don't render truly empty TaskOutput
  }

  // Show full error with AgentResultCard for better display
  if (hasError) {
    return (
      <div className="py-2 border-b border-surface-tertiary last:border-0">
        <AgentResultCard
          agentType="TaskOutput"
          prompt="Retrieving agent result..."
          error={entry.toolOutput}
          timestamp={entry.timestamp}
        />
      </div>
    )
  }

  // Show successful result with AgentResultCard
  return (
    <div className="py-2 border-b border-surface-tertiary last:border-0">
      <AgentResultCard
        agentType="TaskOutput"
        prompt="Agent completed task"
        result={entry.toolOutput}
        timestamp={entry.timestamp}
      />
    </div>
  )
}

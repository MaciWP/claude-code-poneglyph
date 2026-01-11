import { memo } from 'react'
import type { LogEntry } from '../../types/chat'
import {
  AgentResultView,
  AskUserQuestionView,
  TaskToolView,
  TaskOutputView,
  ContextEntryView,
  StandardLogEntry,
  EditToolView,
} from './log-entries'
import ParallelExecutionCard from './ParallelExecutionCard'

interface Props {
  entry: LogEntry
  onExpandImage: (src: string) => void
  activeAgent?: string
  sessionId?: string
  onSendMessage?: (message: string) => void
}

export default memo(function LogEntryView({ entry, onExpandImage, activeAgent, sessionId, onSendMessage }: Props) {
  // AskUserQuestion - interactive question UI
  if (entry.type === 'tool' && entry.tool === 'AskUserQuestion') {
    return <AskUserQuestionView entry={entry} onSendMessage={onSendMessage} />
  }

  // Agent result - completed agent summary
  if (entry.type === 'agent_result') {
    return <AgentResultView entry={entry} />
  }

  // Task tool - spawning a new agent (uses entry.agentTodos directly)
  if (entry.type === 'tool' && entry.tool === 'Task') {
    return <TaskToolView entry={entry} activeAgent={activeAgent} />
  }

  // TaskOutput - retrieving agent results
  if (entry.type === 'tool' && entry.tool === 'TaskOutput') {
    return <TaskOutputView entry={entry} />
  }

  // Parallel Execution - tools from multiple parallel agents
  if (entry.type === 'tool' && entry.tool === 'ParallelExecution') {
    const input = entry.toolInput as { activeAgentCount?: number } | undefined
    return (
      <div className="py-2">
        <ParallelExecutionCard
          steps={entry.agentSteps || []}
          activeAgentCount={input?.activeAgentCount || 0}
          isActive={!entry.toolOutput}
        />
      </div>
    )
  }

  // Edit tool - show diff view
  if (entry.type === 'tool' && entry.tool === 'Edit') {
    return <EditToolView entry={entry} />
  }

  // Context entry - skills, rules, hooks, etc.
  if (entry.type === 'init' && typeof entry.content === 'string' && entry.content.startsWith('context:')) {
    return <ContextEntryView entry={entry} />
  }

  // Standard log entry - responses, tools, thinking, etc.
  return (
    <StandardLogEntry
      entry={entry}
      onExpandImage={onExpandImage}
      activeAgent={activeAgent}
      sessionId={sessionId}
    />
  )
})

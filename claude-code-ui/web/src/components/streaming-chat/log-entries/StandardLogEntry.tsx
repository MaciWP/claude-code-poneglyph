import { memo } from 'react'
import type { LogEntry } from '../../../types/chat'
import { LOG_TYPE_BADGES } from '../../../types/chat'
import MarkdownContent from '../MarkdownContent'
import ToolCard from '../ToolCard'
import { LogEntryWrapper, CopyButton, FeedbackButtons } from './shared'

const AGENT_BADGE_COLORS: Record<string, string> = {
  builder: 'bg-blue-500/20 text-blue-400',
  scout: 'bg-green-500/20 text-green-400',
  reviewer: 'bg-purple-500/20 text-purple-400',
  'error-analyzer': 'bg-red-500/20 text-red-400',
  planner: 'bg-amber-500/20 text-amber-400',
  architect: 'bg-cyan-500/20 text-cyan-400',
  'refactor-agent': 'bg-teal-500/20 text-teal-400',
  'security-auditor': 'bg-rose-500/20 text-rose-400',
}

function getAgentBadgeClass(agentName: string): string {
  const normalized = agentName.toLowerCase()
  return AGENT_BADGE_COLORS[normalized] || 'bg-orange-500/20 text-orange-400'
}

interface StandardLogEntryProps {
  entry: LogEntry
  onExpandImage: (src: string) => void
  activeAgent?: string
  sessionId?: string
}

export default memo(function StandardLogEntry({
  entry,
  onExpandImage,
  activeAgent,
  sessionId,
}: StandardLogEntryProps) {
  const safeContent =
    typeof entry.content === 'string'
      ? entry.content
      : (() => {
          try {
            return JSON.stringify(entry.content)
          } catch {
            return String(entry.content)
          }
        })()

  const isUserMessage = safeContent.startsWith('> ')
  const isAssistantResponse = entry.type === 'response' && !isUserMessage
  const shouldRenderMarkdown = entry.type === 'response' && !isUserMessage
  const isToolEntry = entry.type === 'tool' && entry.tool

  const getContentColor = (): string => {
    if (isUserMessage) return 'text-teal-300'
    if (entry.type === 'thinking') return 'text-purple-400/80 italic'
    if (entry.type === 'response') return 'text-blue-300'
    return 'text-gray-300'
  }

  if (isToolEntry) {
    return (
      <LogEntryWrapper borderColor={activeAgent ? 'orange' : 'none'}>
        <ToolCard
          toolName={entry.tool!}
          toolInput={entry.toolInput}
          toolOutput={entry.toolOutput}
          timestamp={entry.timestamp}
          agentName={entry.agent || activeAgent}
        />
      </LogEntryWrapper>
    )
  }

  return (
    <LogEntryWrapper backgroundColor={isUserMessage ? 'teal' : 'none'}>
      <div className="flex items-start gap-2 flex-wrap">
        <span
          className={`px-1.5 py-0.5 rounded text-xs ${
            isUserMessage ? 'bg-teal-600/20 text-teal-400' : LOG_TYPE_BADGES[entry.type]
          }`}
        >
          {isUserMessage ? 'YOU' : entry.type.toUpperCase()}
        </span>
        <span className="text-xs text-gray-600">{entry.timestamp.toLocaleTimeString()}</span>
        {(entry.agent || activeAgent) && !isUserMessage && (
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${getAgentBadgeClass(entry.agent || activeAgent || '')}`}
          >
            {entry.agent || activeAgent}
          </span>
        )}

        {(entry.type === 'response' || entry.type === 'result') && !isUserMessage && (
          <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAssistantResponse && (
              <FeedbackButtons
                entryId={entry.id || `${entry.timestamp.getTime()}`}
                content={safeContent}
                sessionId={sessionId}
              />
            )}
            <CopyButton content={safeContent} />
          </div>
        )}
      </div>

      <div className={`mt-1 ${getContentColor()}`}>
        {shouldRenderMarkdown ? (
          <MarkdownContent content={safeContent} />
        ) : (
          <span className="whitespace-pre-wrap break-words">
            {isUserMessage ? safeContent.slice(2) : safeContent}
          </span>
        )}
      </div>

      {entry.images && entry.images.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {entry.images.map((src, idx) => (
            <img
              key={idx}
              src={src}
              alt={`Attached ${idx + 1}`}
              className="h-24 w-24 object-cover rounded border border-stroke-primary cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => onExpandImage(src)}
            />
          ))}
        </div>
      )}
    </LogEntryWrapper>
  )
})

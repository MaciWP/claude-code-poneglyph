import { useState } from 'react'
import type { LogEntry } from '../../../types/chat'
import MarkdownContent from '../MarkdownContent'
import { Icons } from '../../../lib/icons'
import {
  LogEntryWrapper,
  CopyButton,
  ExpandCollapseButton,
  formatTimestamp,
} from './shared'

interface AgentResultViewProps {
  entry: LogEntry
}

export default function AgentResultView({ entry }: AgentResultViewProps) {
  const [showActivity, setShowActivity] = useState(false)

  const stepMatches = entry.content.match(/(?:^|\n)(Step \d+[:|-]?.+?)(?=\n|$)/gi) || []
  const notificationMatches = entry.content.match(/(?:^|\n)([✓✗❌⚠🔄].+?)(?=\n|$)/gu) || []
  const hasActivity = stepMatches.length > 0 || notificationMatches.length > 0
  const agentTools = entry.agentTools || []
  const hasTools = agentTools.length > 0

  const toolCounts = agentTools.reduce((acc, tool) => {
    acc[tool] = (acc[tool] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <LogEntryWrapper borderColor="green">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-400 font-medium text-sm flex items-center gap-1">
          <Icons.check className="w-4 h-4" /> Agent Completed
        </span>
        {entry.agentType && (
          <span className="text-xs text-green-300">({entry.agentType})</span>
        )}
        {hasTools && (
          <span className="text-xs text-gray-500">• {agentTools.length} tools</span>
        )}
        <span className="text-xs text-gray-500 ml-auto">
          {formatTimestamp(entry.timestamp)}
        </span>
      </div>

      {hasTools && (
        <div className="mb-2 flex flex-wrap gap-1">
          {Object.entries(toolCounts).map(([tool, count]) => (
            <span
              key={tool}
              className="text-[11px] bg-gray-700/50 text-gray-400 px-1.5 py-0.5 rounded"
            >
              {tool}{count > 1 ? ` x${count}` : ''}
            </span>
          ))}
        </div>
      )}

      {hasActivity && (
        <div className="mb-2">
          <ExpandCollapseButton
            expanded={showActivity}
            onClick={() => setShowActivity(!showActivity)}
            label={`Activity Summary (${stepMatches.length + notificationMatches.length} items)`}
          />
          {showActivity && (
            <div className="mt-2 ml-4 border-l-2 border-orange-500/30 pl-3 space-y-1">
              {stepMatches.map((step, i) => (
                <div key={`step-${i}`} className="text-xs text-gray-400 font-mono">
                  {step.trim()}
                </div>
              ))}
              {notificationMatches.map((notif, i) => (
                <div key={`notif-${i}`} className="text-xs text-gray-300">
                  {notif.trim()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] text-green-400 uppercase">Result</div>
          <CopyButton content={entry.content} />
        </div>
        <div className="text-sm text-gray-200">
          <MarkdownContent content={entry.content} />
        </div>
      </div>
    </LogEntryWrapper>
  )
}

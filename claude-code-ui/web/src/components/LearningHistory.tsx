import { useState, useEffect } from 'react'
import { getLearningHistory, type LearningHistory as LearningHistoryType, type LearningHistoryItem } from '../lib/api'
import { Icons } from '../lib/icons'
import { cn, formatDurationMs } from '../lib/utils'

interface Props {
  expertId: string
  onClose?: () => void
}

export default function LearningHistory({ expertId, onClose }: Props) {
  const [history, setHistory] = useState<LearningHistoryType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getLearningHistory(expertId)
      .then(setHistory)
      .finally(() => setLoading(false))
  }, [expertId])

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Icons.loader className="w-5 h-5 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!history || history.history.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Learning History</h3>
          {onClose && (
            <button onClick={onClose} className="text-content-muted hover:text-white">
              <Icons.x className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-center py-8 text-content-muted">
          <Icons.clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No learning history yet</p>
          <p className="text-xs mt-1">Execute tasks to build learning history</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icons.clock className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-white">
            Learning History: <span className="text-purple-400">{expertId}</span>
          </h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-content-muted hover:text-white">
            <Icons.x className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="text-xs text-content-muted mb-4">
        {history.history.length} execution{history.history.length !== 1 ? 's' : ''} recorded
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-stroke-primary" />

        {/* Timeline items */}
        <div className="space-y-3">
          {history.history.map((item, index) => (
            <TimelineItem key={`${item.agentId}-${index}`} item={item} isFirst={index === 0} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ item, isFirst }: { item: LearningHistoryItem; isFirst: boolean }) {
  const [expanded, setExpanded] = useState(isFirst)

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-1.5 w-3 h-3 rounded-full border-2',
          item.success
            ? 'bg-green-500/20 border-green-500'
            : 'bg-red-500/20 border-red-500'
        )}
      />

      <div
        className={cn(
          'rounded-lg border transition-colors cursor-pointer',
          expanded ? 'bg-surface-hover border-stroke-primary' : 'bg-surface-secondary border-transparent hover:border-stroke-primary'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                item.success
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              )}>
                {item.success ? 'Success' : 'Failed'}
              </span>
              <span className="text-sm text-white font-medium">{item.agentType}</span>
            </div>
            <Icons.chevronDown
              className={cn(
                'w-4 h-4 text-content-muted transition-transform',
                expanded && 'rotate-180'
              )}
            />
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-stroke-primary space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-content-muted">Agent ID:</span>
                  <span className="ml-2 text-white font-mono">{item.agentId.slice(0, 8)}...</span>
                </div>
                <div>
                  <span className="text-content-muted">Session:</span>
                  <span className="ml-2 text-white font-mono">{item.sessionId.slice(0, 8)}...</span>
                </div>
                <div>
                  <span className="text-content-muted">Tool Calls:</span>
                  <span className="ml-2 text-white">{item.toolCalls}</span>
                </div>
                <div>
                  <span className="text-content-muted">Duration:</span>
                  <span className="ml-2 text-white">{formatDurationMs(item.durationMs)}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1 text-xs text-content-muted">
                  <Icons.zap className="w-3 h-3" />
                  <span>{item.toolCalls} tools</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-content-muted">
                  <Icons.clock className="w-3 h-3" />
                  <span>{formatDurationMs(item.durationMs)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

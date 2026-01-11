import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'
import { Icons } from '../lib/icons'
import { Card } from './ui/Card'
import type { LearningEvent, LearningChange } from '../hooks/useLearningEvents'

export type { LearningEvent, LearningChange }

interface Props {
  events: LearningEvent[]
  className?: string
}

export default function LearningIndicator({ events, className }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [recentEvents, setRecentEvents] = useState<LearningEvent[]>([])

  useEffect(() => {
    if (events.length > 0) {
      setRecentEvents(prev => [...events, ...prev].slice(0, 10))
    }
  }, [events])

  const activeCount = recentEvents.filter(e => e.type === 'learning:started').length
  const completedCount = recentEvents.filter(e => e.type === 'learning:completed').length
  const isLearning = activeCount > completedCount

  if (recentEvents.length === 0) {
    return null
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
          isLearning
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        )}
      >
        {isLearning ? (
          <>
            <Icons.brain className="w-4 h-4 animate-pulse" />
            <span>Learning...</span>
          </>
        ) : (
          <>
            <Icons.sparkles className="w-4 h-4" />
            <span>Learned {completedCount}</span>
          </>
        )}
        <Icons.chevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <Card className="absolute top-full right-0 mt-2 w-80 z-50 p-3 shadow-lg">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Icons.brain className="w-4 h-4" />
            Learning History
          </h4>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentEvents.map((event, idx) => (
              <LearningEventItem key={idx} event={event} />
            ))}
          </div>

          {recentEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">No learning events yet</p>
          )}
        </Card>
      )}
    </div>
  )
}

function LearningEventItem({ event }: { event: LearningEvent }) {
  const getIcon = () => {
    switch (event.type) {
      case 'learning:started':
        return <Icons.loader className="w-4 h-4 animate-spin text-purple-500" />
      case 'learning:completed':
        return <Icons.checkCircle className="w-4 h-4 text-green-500" />
      case 'learning:failed':
        return <Icons.alertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (event.type) {
      case 'learning:started':
        return 'Learning in progress'
      case 'learning:completed':
        return `Learned ${event.changes?.length || 0} items`
      case 'learning:failed':
        return 'Learning failed'
    }
  }

  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{event.expertId}</span>
          {event.newConfidence !== undefined && (
            <span className="text-xs text-muted-foreground">
              {(event.newConfidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{getStatusText()}</p>

        {event.changes && event.changes.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {event.changes.slice(0, 3).map((change, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <ChangeIcon type={change.type} />
                <span className="truncate">{change.description}</span>
              </div>
            ))}
            {event.changes.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{event.changes.length - 3} more
              </span>
            )}
          </div>
        )}

        {event.error && (
          <p className="text-xs text-red-500 mt-1">{event.error}</p>
        )}
      </div>
    </div>
  )
}

function ChangeIcon({ type }: { type: LearningChange['type'] }) {
  switch (type) {
    case 'pattern':
      return <Icons.puzzle className="w-3 h-3 text-blue-500" />
    case 'issue':
      return <Icons.alertTriangle className="w-3 h-3 text-yellow-500" />
    case 'file':
      return <Icons.file className="w-3 h-3 text-gray-500" />
    case 'confidence':
      return <Icons.trendingUp className="w-3 h-3 text-green-500" />
    default:
      return <Icons.dot className="w-3 h-3" />
  }
}


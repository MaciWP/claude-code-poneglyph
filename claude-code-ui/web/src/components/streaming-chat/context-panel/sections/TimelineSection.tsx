import { useState } from 'react'
import type { TimelineEvent } from '../../../../types/chat'
import { Icons } from '../../../../lib/icons'
import { SectionHeader } from '../shared'
import { EmptyState } from '../../../ui'

interface Props {
  events: TimelineEvent[]
}

export default function TimelineSection({ events }: Props) {
  const [expanded, setExpanded] = useState(true)
  const displayEvents = events.slice(0, 10)

  return (
    <div className="p-3 flex-1">
      <SectionHeader
        icon="clock"
        title="TIMELINE"
        count={events.length}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />

      {expanded && (
        events.length === 0 ? (
          <EmptyState
            icon="clock"
            title="No events yet"
            variant="inline"
          />
        ) : (
          <div className="space-y-2 animate-fade-in">
            {displayEvents.map(event => (
              <TimelineItem key={event.id} event={event} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const timeStr = event.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  function getEventIcon() {
    if (event.type === 'agent') return Icons.bot
    if (event.type === 'mcp') return Icons.plug
    if (event.type === 'context') return Icons.zap
    if (event.type === 'error') return Icons.error
    return Icons.settings
  }

  const EventIcon = getEventIcon()
  const statusColor =
    event.status === 'running'
      ? 'text-orange-500'
      : event.status === 'failed'
      ? 'text-red-500'
      : 'text-green-500'

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-gray-600 font-mono w-16 flex-shrink-0">{timeStr}</span>
      <EventIcon className="w-3 h-3" />
      <span className="text-gray-400 truncate flex-1">{event.name}</span>
      <span className={statusColor}>
        {event.status === 'running' ? (
          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse inline-block" />
        ) : event.status === 'failed' ? (
          <Icons.x className="w-3 h-3" />
        ) : (
          <Icons.check className="w-3 h-3" />
        )}
      </span>
    </div>
  )
}

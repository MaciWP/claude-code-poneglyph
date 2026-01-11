import { useState } from 'react'
import { CONTEXT_TAXONOMY, type ContextType } from '../../types/chat'
import type { MemorySummary } from '../../hooks/chunk-handler/types'
import { Icons } from '../../lib/icons'
import { cn } from '../../lib/utils'

interface ContextBadgeProps {
  type: ContextType
  name: string
  detail?: string
  status?: 'active' | 'completed' | 'failed'
  memories?: MemorySummary[]
}

export function ContextBadge({ type, name, detail, status, memories }: ContextBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = CONTEXT_TAXONOMY[type]
  const IconComponent = Icons[config.icon]
  const hasMemories = memories && memories.length > 0

  const statusBadge = status === 'active'
    ? <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
    : status === 'failed'
      ? <Icons.x className="w-3 h-3 text-red-400" />
      : status === 'completed'
        ? <Icons.check className="w-3 h-3 text-green-400" />
        : null

  return (
    <div className={`rounded-lg border ${config.bgColor} border-opacity-30 overflow-hidden`}>
      <div
        className={cn(
          'px-3 py-2 flex items-center gap-2',
          hasMemories && 'cursor-pointer hover:bg-white/5'
        )}
        onClick={() => hasMemories && setIsExpanded(!isExpanded)}
      >
        <IconComponent className="w-5 h-5" />
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${config.color} flex items-center gap-2`}>
            {config.label}: {name}
            {statusBadge}
            {hasMemories && (
              <Icons.chevronDown className={cn(
                'w-4 h-4 transition-transform',
                isExpanded && 'rotate-180'
              )} />
            )}
          </div>
          {detail && (
            <div className="text-xs text-gray-500 truncate">{detail}</div>
          )}
        </div>
      </div>

      {/* Expandable memory list */}
      {hasMemories && isExpanded && (
        <div className="border-t border-white/10 px-3 py-2 space-y-2">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="flex items-start gap-2 text-xs bg-black/20 rounded-md px-2 py-1.5"
            >
              <span className="text-indigo-400 font-mono shrink-0">
                [{mem.type.toUpperCase()}]
              </span>
              <span className="text-gray-300 flex-1 min-w-0 truncate">
                {mem.title}
              </span>
              <span className="text-gray-500 shrink-0">
                {mem.similarity}% match
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


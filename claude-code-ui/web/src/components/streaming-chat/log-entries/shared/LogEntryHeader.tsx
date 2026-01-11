import type { ReactNode } from 'react'
import { LOG_TYPE_BADGES } from '../../../../types/chat'

type BadgeType = 'response' | 'tool' | 'thinking' | 'result' | 'init' | 'user' | 'agent' | 'error'

interface LogEntryHeaderProps {
  badge: BadgeType | string
  timestamp: Date
  children?: ReactNode
  customBadgeClass?: string
}

const badgeClasses: Record<string, string> = {
  user: 'bg-teal-600/20 text-teal-400',
  agent: 'bg-green-600/20 text-green-400',
  error: 'bg-red-600/20 text-red-400',
}

export default function LogEntryHeader({
  badge,
  timestamp,
  children,
  customBadgeClass,
}: LogEntryHeaderProps) {
  const badgeClass = customBadgeClass
    || badgeClasses[badge]
    || LOG_TYPE_BADGES[badge as keyof typeof LOG_TYPE_BADGES]
    || 'bg-gray-600/20 text-gray-400'

  const badgeLabel = badge === 'user' ? 'YOU' : badge.toUpperCase()

  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span className={`px-1.5 py-0.5 rounded text-xs ${badgeClass}`}>
        {badgeLabel}
      </span>
      <span className="text-xs text-gray-600">
        {timestamp.toLocaleTimeString()}
      </span>
      {children && (
        <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {children}
        </div>
      )}
    </div>
  )
}

export function formatTimestamp(date: Date, includeSeconds = true): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
  }
  return date.toLocaleTimeString([], options)
}

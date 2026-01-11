import type { LogEntry, ContextEntry } from '../../../types/chat'
import type { MemorySummary } from '../../../hooks/chunk-handler/types'
import { ContextBadge } from '../ContextBadges'

interface ContextEntryViewProps {
  entry: LogEntry
}

interface MemoryToolInput {
  detail?: string
  memories?: MemorySummary[]
}

export default function ContextEntryView({ entry }: ContextEntryViewProps) {
  const contextMatch = entry.content.match(/context:(\w+):(.+)/)

  if (!contextMatch) {
    return null
  }

  const contextEntry: ContextEntry = {
    id: entry.id,
    type: contextMatch[1] as ContextEntry['type'],
    name: contextMatch[2],
    timestamp: entry.timestamp,
  }

  // Handle both string and object formats for toolInput
  const toolInput = entry.toolInput
  let detail: string | undefined
  let memories: MemorySummary[] | undefined

  if (typeof toolInput === 'string') {
    detail = toolInput
  } else if (toolInput && typeof toolInput === 'object') {
    const memInput = toolInput as MemoryToolInput
    detail = memInput.detail
    memories = memInput.memories
  }

  return (
    <div className="py-2">
      <ContextBadge
        type={contextEntry.type}
        name={contextEntry.name}
        detail={detail}
        memories={memories}
      />
    </div>
  )
}

import type { EnhancedActivityContext } from '../../../types/chat'
import { Icons } from '../../../lib/icons'
import {
  ContextUsageSection,
  ActiveNowSection,
  ToolsUsedSection,
  TimelineSection,
} from './sections'

interface Props {
  activity: EnhancedActivityContext
  isOpen: boolean
  onToggle: () => void
  onClear: () => void
}

export default function ContextPanel({ activity, isOpen, onToggle, onClear }: Props) {
  if (!isOpen) {
    return <CollapsedView onToggle={onToggle} />
  }

  return (
    <div className="w-80 border-r border-stroke-primary bg-surface-secondary overflow-y-auto flex flex-col">
      <Header onClear={onClear} onToggle={onToggle} />

      <ContextUsageSection usage={activity.contextUsage} />

      {activity.activeOperations.length > 0 && (
        <ActiveNowSection operations={activity.activeOperations} />
      )}

      <ToolsUsedSection tools={activity.toolsUsed} />

      {activity.timeline.length > 0 && (
        <TimelineSection events={activity.timeline} />
      )}
    </div>
  )
}

function CollapsedView({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-8 border-r border-stroke-primary bg-surface-secondary flex items-center justify-center text-gray-600 hover:text-gray-400 hover:bg-surface-tertiary transition-colors"
      title="Expand activity panel"
    >
      <Icons.chevronRight className="w-4 h-4" />
    </button>
  )
}

function Header({ onClear, onToggle }: { onClear: () => void; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-stroke-primary sticky top-0 bg-surface-secondary z-10">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
        <Icons.activity className="w-4 h-4" />
        <span>Activity</span>
      </h3>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="text-gray-600 hover:text-gray-400"
          title="Clear"
        >
          <Icons.x className="w-3 h-3" />
        </button>
        <button
          onClick={onToggle}
          className="text-gray-600 hover:text-gray-400"
          title="Collapse"
        >
          <Icons.chevronLeft className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

import { FILTER_BUTTONS, type FilterType, type LogEntry } from '../../types/chat'
import { Icons } from '../../lib/icons'

interface Props {
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
  logs: LogEntry[]
}

function getFilterCounts(logs: LogEntry[]): Record<FilterType, number> {
  const counts: Record<FilterType, number> = {
    all: logs.length,
    response: 0,
    tool: 0,
    file: 0,
    exec: 0,
    agent: 0,
    mcp: 0,
    plan: 0,
    context: 0,
    thinking: 0,
  }

  for (const log of logs) {
    if (log.type === 'response' || log.type === 'result') counts.response++
    if (log.type === 'thinking') counts.thinking++
    if (log.type === 'init' && log.content.startsWith('context:')) counts.context++

    if (log.type === 'tool') {
      const toolName = log.tool || ''
      if (!toolName.toLowerCase().includes('task')) counts.tool++
      if (['Read', 'Write', 'Edit', 'Glob', 'Grep', 'NotebookEdit'].includes(toolName)) counts.file++
      if (['Bash', 'KillShell'].includes(toolName)) counts.exec++
      if (toolName.toLowerCase().includes('task')) counts.agent++
      if (toolName.startsWith('mcp__')) counts.mcp++
      if (['TodoWrite', 'EnterPlanMode', 'ExitPlanMode'].includes(toolName)) counts.plan++
    }

    if (log.type === 'agent_result') counts.agent++
  }

  return counts
}

const FILTER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  gray: { bg: 'rgba(107, 114, 128, 0.3)', text: 'rgb(156, 163, 175)', border: 'rgba(107, 114, 128, 0.5)' },
  blue: { bg: 'rgba(59, 130, 246, 0.3)', text: 'rgb(96, 165, 250)', border: 'rgba(59, 130, 246, 0.5)' },
  green: { bg: 'rgba(34, 197, 94, 0.3)', text: 'rgb(74, 222, 128)', border: 'rgba(34, 197, 94, 0.5)' },
  emerald: { bg: 'rgba(16, 185, 129, 0.3)', text: 'rgb(52, 211, 153)', border: 'rgba(16, 185, 129, 0.5)' },
  sky: { bg: 'rgba(14, 165, 233, 0.3)', text: 'rgb(56, 189, 248)', border: 'rgba(14, 165, 233, 0.5)' },
  purple: { bg: 'rgba(168, 85, 247, 0.3)', text: 'rgb(192, 132, 252)', border: 'rgba(168, 85, 247, 0.5)' },
  orange: { bg: 'rgba(249, 115, 22, 0.3)', text: 'rgb(251, 146, 60)', border: 'rgba(249, 115, 22, 0.5)' },
  pink: { bg: 'rgba(236, 72, 153, 0.3)', text: 'rgb(244, 114, 182)', border: 'rgba(236, 72, 153, 0.5)' },
  rose: { bg: 'rgba(244, 63, 94, 0.3)', text: 'rgb(251, 113, 133)', border: 'rgba(244, 63, 94, 0.5)' },
  cyan: { bg: 'rgba(6, 182, 212, 0.3)', text: 'rgb(34, 211, 238)', border: 'rgba(6, 182, 212, 0.5)' },
}

export default function FilterBar({ filter, onFilterChange, logs }: Props) {
  const counts = getFilterCounts(logs)

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-stroke-primary flex-wrap">
      {FILTER_BUTTONS.map(btn => {
        const isActive = filter === btn.key
        const colors = FILTER_COLORS[btn.color] || FILTER_COLORS.gray
        const IconComponent = btn.icon ? Icons[btn.icon] : null
        const count = counts[btn.key]

        return (
          <button
            key={btn.key}
            onClick={() => onFilterChange(btn.key)}
            aria-pressed={isActive}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 ease-out flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98] ${
              isActive
                ? 'border shadow-sm'
                : 'bg-surface-input text-gray-500 hover:text-gray-300 border border-transparent hover:bg-surface-hover hover:shadow-sm'
            }`}
            style={isActive ? {
              backgroundColor: colors.bg,
              color: colors.text,
              borderColor: colors.border,
            } : undefined}
          >
            {IconComponent && <IconComponent className="w-3 h-3" />}
            <span>{btn.label}</span>
            {count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/10 text-gray-400">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

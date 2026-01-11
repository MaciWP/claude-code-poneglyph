import { memo } from 'react'
import type { QuickToolItem, QuickToolsState } from '../../types/chat'
import { Icons } from '../../lib/icons'
import { cn } from '../../lib/utils'

interface Props {
  state: QuickToolsState
  onSelectTool: (tool: QuickToolItem) => void
}

const ROW_CONFIG: Array<{
  key: 'skills' | 'commands' | 'agents'
  label: string
  icon: keyof typeof Icons
  color: string
  bg: string
}> = [
  { key: 'skills', label: 'Skills', icon: 'zap', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { key: 'commands', label: 'Commands', icon: 'terminal', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { key: 'agents', label: 'Agents', icon: 'bot', color: 'text-orange-400', bg: 'bg-orange-500/20' },
]

export default memo(function QuickToolsBar({ state, onSelectTool }: Props) {
  if (!state.isVisible) {
    return null
  }

  const hasAnyTools =
    state.toolsByType.skills.length > 0 ||
    state.toolsByType.commands.length > 0 ||
    state.toolsByType.agents.length > 0

  if (!hasAnyTools) {
    return null
  }

  return (
    <div className="px-4 py-2 border-t border-stroke-primary bg-surface-secondary">
      <div className="flex flex-col gap-1.5">
        {ROW_CONFIG.map(({ key, label, icon, color, bg }) => {
          const tools = state.toolsByType[key]
          if (tools.length === 0) return null

          const Icon = Icons[icon]

          return (
            <div key={key} className="flex items-center gap-2">
              <span className={cn('text-xs font-medium w-20 shrink-0', color)}>
                {label}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tools.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => onSelectTool(tool)}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-150',
                      'hover:scale-[1.02] active:scale-[0.98] hover:brightness-110',
                      bg,
                      color
                    )}
                    title={tool.description}
                  >
                    <Icon className="w-3 h-3" />
                    <span>
                      {key === 'commands'
                        ? (tool.name.startsWith('/') ? tool.name : `/${tool.name}`)
                        : tool.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

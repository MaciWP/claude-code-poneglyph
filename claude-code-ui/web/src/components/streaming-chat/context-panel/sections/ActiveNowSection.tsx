import type { ActiveOperation } from '../../../../types/chat'
import { Icons } from '../../../../lib/icons'

interface Props {
  operations: ActiveOperation[]
}

export default function ActiveNowSection({ operations }: Props) {
  function getOpIcon(type: ActiveOperation['type']) {
    if (type === 'agent') return Icons.bot
    if (type === 'mcp') return Icons.plug
    return Icons.settings
  }

  return (
    <div className="p-3 border-b border-stroke-primary bg-orange-500/5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-400 uppercase mb-2">
        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        <span>Active Now</span>
        <span className="text-orange-500/60">({operations.length})</span>
      </div>

      <div className="space-y-1.5">
        {operations.map(op => {
          const OpIcon = getOpIcon(op.type)
          return (
            <div
              key={op.id}
              className="flex items-center gap-2 p-1.5 rounded bg-surface-tertiary border border-orange-500/30"
            >
              <OpIcon className="w-4 h-4" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-orange-400 truncate">{op.name}</div>
                {op.detail && (
                  <div className="text-[11px] text-gray-500 truncate">{op.detail}</div>
                )}
              </div>
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse flex-shrink-0" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

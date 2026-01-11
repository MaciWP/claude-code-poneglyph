import { useState } from 'react'
import type { ContextUsage } from '../../../../types/chat'
import { Icons, type IconName } from '../../../../lib/icons'
import { SectionHeader } from '../shared'

interface Props {
  usage: ContextUsage
}

export default function ContextUsageSection({ usage }: Props) {
  const [expanded, setExpanded] = useState(true)
  const percentage = Math.min(usage.percentage, 100)
  const colorClass = percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-emerald-500'
  const textClass = percentage > 80 ? 'text-red-400' : percentage > 60 ? 'text-yellow-400' : 'text-emerald-400'

  const hasContent =
    usage.breakdown.rules.count > 0 ||
    usage.breakdown.skills.count > 0 ||
    usage.breakdown.mcpServers.count > 0 ||
    usage.breakdown.memories.count > 0

  if (!hasContent && usage.estimatedTokens === 0) {
    return null
  }

  return (
    <div className="p-3 border-b border-stroke-primary">
      <SectionHeader
        icon="chart"
        title="CONTEXT"
        collapsible
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />

      {expanded && (
        <>
          <div className="h-1.5 bg-gray-800 rounded-full mb-1.5 overflow-hidden">
            <div
              className={`h-full ${colorClass} transition-all`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className={`text-[11px] ${textClass} mb-3`}>
            {percentage > 0 ? `~${percentage}% context` : 'Minimal context'}
            {usage.estimatedTokens > 0 && ` (~${Math.round(usage.estimatedTokens / 1000)}k tokens)`}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <ContextItem icon="ruler" label="Rules" count={usage.breakdown.rules.count} names={usage.breakdown.rules.names} />
            <ContextItem icon="zap" label="Skills" count={usage.breakdown.skills.count} names={usage.breakdown.skills.names} />
            <ContextItem icon="plug" label="MCPs" count={usage.breakdown.mcpServers.count} names={usage.breakdown.mcpServers.names} />
            <ContextItem icon="brain" label="Memories" count={usage.breakdown.memories.count} />
          </div>
        </>
      )}
    </div>
  )
}

function ContextItem({
  icon,
  label,
  count,
  names,
}: {
  icon: IconName
  label: string
  count: number
  names?: string[]
}) {
  const [showNames, setShowNames] = useState(false)
  const IconComponent = Icons[icon]

  if (count === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
        <IconComponent className="w-3 h-3" />
        <span>{label}: 0</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => names && names.length > 0 && setShowNames(!showNames)}
        className={`flex items-center gap-1.5 text-[11px] text-gray-400 ${
          names && names.length > 0 ? 'hover:text-gray-300 cursor-pointer' : ''
        }`}
      >
        <IconComponent className="w-3 h-3" />
        <span>
          {label}: <span className="text-gray-300 font-medium">{count}</span>
        </span>
        {names && names.length > 0 && <Icons.chevronDown className="w-3 h-3 text-gray-600" />}
      </button>
      {showNames && names && names.length > 0 && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-surface-tertiary border border-stroke-secondary rounded shadow-lg z-20 min-w-32">
          {names.map((name, idx) => (
            <div key={idx} className="text-[11px] text-gray-400 truncate">
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

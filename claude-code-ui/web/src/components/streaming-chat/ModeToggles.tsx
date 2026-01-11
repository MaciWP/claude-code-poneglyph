import { memo } from 'react'
import type { ClaudeModes } from '../../App'
import { ToggleBadge } from '../ui/Badge'

interface Props {
  modes: ClaudeModes
  onToggle: (mode: keyof ClaudeModes) => void
}

const MODE_CONFIG: Array<{
  key: keyof ClaudeModes
  label: string
  color: 'purple' | 'blue' | 'green' | 'orange'
}> = [
  { key: 'orchestrate', label: 'Orchestrate', color: 'purple' },
  { key: 'planMode', label: 'Plan', color: 'green' },
  { key: 'bypassPermissions', label: 'Bypass', color: 'orange' },
]

export default memo(function ModeToggles({ modes, onToggle }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      {MODE_CONFIG.map(({ key, label, color }) => (
        <ToggleBadge
          key={key}
          active={modes[key]}
          onClick={() => onToggle(key)}
          color={color}
          size="xs"
        >
          {label}
        </ToggleBadge>
      ))}
    </div>
  )
})

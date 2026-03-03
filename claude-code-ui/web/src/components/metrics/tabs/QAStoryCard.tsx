import type { QAResult } from '../../../hooks/useQADashboard'
import { Icons } from '../../../lib/icons'
import { Badge, Button } from '../../ui'

interface QAStoryCardProps {
  name: string
  lastResult: QAResult | null
  isRunning: boolean
  onRun: () => void
}

function getStatusBadge(result: QAResult | null): JSX.Element {
  if (!result) {
    return (
      <Badge color="gray" size="xs">
        --
      </Badge>
    )
  }

  switch (result.status) {
    case 'passed':
      return (
        <Badge color="green" size="xs">
          PASS
        </Badge>
      )
    case 'failed':
      return (
        <Badge color="red" size="xs">
          FAIL
        </Badge>
      )
    case 'running':
      return (
        <Badge color="blue" size="xs">
          RUNNING
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge color="amber" size="xs">
          CANCELLED
        </Badge>
      )
  }
}

export default function QAStoryCard({
  name,
  lastResult,
  isRunning,
  onRun,
}: QAStoryCardProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-2 px-3 hover:bg-surface-hover/30 transition-colors border-b border-white/5 last:border-b-0">
      <Icons.clipboard className="w-4 h-4 text-blue-400 shrink-0" />

      <span className="text-sm text-white flex-1 min-w-0 truncate">{name}</span>

      {getStatusBadge(lastResult)}

      {isRunning ? (
        <Icons.loader className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
      ) : (
        <Button
          variant="secondary"
          size="sm"
          icon={<Icons.play className="w-3.5 h-3.5" />}
          onClick={onRun}
        >
          Run
        </Button>
      )}
    </div>
  )
}

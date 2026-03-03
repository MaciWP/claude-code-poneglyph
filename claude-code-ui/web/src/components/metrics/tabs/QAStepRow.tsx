import type { QAStepResult } from '../../../hooks/useQADashboard'
import { Icons } from '../../../lib/icons'
import { cn } from '../../../lib/utils'

interface QAStepRowProps {
  step: QAStepResult
  storyName: string
}

const STATUS_CONFIG = {
  passed: { icon: Icons.checkCircle, className: 'text-green-400' },
  running: { icon: Icons.loader, className: 'text-blue-400 animate-spin' },
  pending: { icon: Icons.dot, className: 'text-content-muted' },
  failed: { icon: Icons.error, className: 'text-red-400' },
} as const

export default function QAStepRow({ step, storyName }: QAStepRowProps): JSX.Element {
  const config = STATUS_CONFIG[step.status]
  const StatusIcon = config.icon

  return (
    <div className="flex items-center gap-3 py-1.5 px-3 hover:bg-surface-hover/30 transition-colors">
      <StatusIcon className={cn('w-4 h-4 shrink-0', config.className)} />

      <span className="text-sm text-content-secondary flex-1 min-w-0 truncate">
        <span className="font-medium text-white">{step.action}</span>
        <span className="text-content-muted mx-1.5">&rarr;</span>
        <span>{step.target}</span>
      </span>

      {step.durationMs !== undefined && (
        <span className="text-xs text-content-muted font-mono shrink-0">{step.durationMs}ms</span>
      )}

      {step.screenshotPath && (
        <a
          href={`/qa-evidence/${step.screenshotPath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <img
            src={`/qa-evidence/${step.screenshotPath}`}
            alt={`Screenshot: ${step.action} - ${storyName}`}
            className="h-8 w-12 object-cover rounded cursor-pointer border border-white/10 hover:border-blue-400 transition-colors"
          />
        </a>
      )}

      {step.error && (
        <span className="text-xs text-red-400 truncate max-w-[200px]" title={step.error}>
          {step.error}
        </span>
      )}
    </div>
  )
}

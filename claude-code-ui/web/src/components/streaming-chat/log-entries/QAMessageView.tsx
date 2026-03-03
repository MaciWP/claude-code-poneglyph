import type { LogEntry } from '../../../types/chat'
import { Icons } from '../../../lib/icons'
import { cn } from '../../../lib/utils'
import { LogEntryWrapper, formatTimestamp } from './shared'

interface QAMessageViewProps {
  entry: LogEntry
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  running: { label: 'RUNNING', className: 'bg-amber-500/20 text-amber-400 animate-pulse' },
  passed: { label: 'PASS', className: 'bg-green-500/20 text-green-400' },
  failed: { label: 'FAIL', className: 'bg-red-500/20 text-red-400' },
  cancelled: { label: 'CANCELLED', className: 'bg-gray-500/20 text-gray-400' },
}

const STEP_STATUS_CONFIG = {
  passed: { icon: Icons.checkCircle, className: 'text-green-400' },
  running: { icon: Icons.loader, className: 'text-amber-400 animate-spin' },
  pending: { icon: Icons.dot, className: 'text-gray-500' },
  failed: { icon: Icons.error, className: 'text-red-400' },
} as const

export default function QAMessageView({ entry }: QAMessageViewProps) {
  const status = entry.qaStatus ?? 'running'
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.running
  const steps = entry.qaSteps ?? []
  const screenshots = entry.qaScreenshots ?? []

  return (
    <LogEntryWrapper borderColor="purple">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-violet-400 font-medium text-sm flex items-center gap-1.5">
          <Icons.target className="w-4 h-4" />
          QA: {entry.qaStoryName ?? 'Unknown'}
        </span>
        <span className={cn('text-[11px] px-1.5 py-0.5 rounded font-medium', badge.className)}>
          {badge.label}
        </span>
        <span className="text-xs text-gray-500 ml-auto">{formatTimestamp(entry.timestamp)}</span>
      </div>

      {steps.length > 0 && (
        <div className="bg-surface-secondary/50 rounded-lg border border-white/5 overflow-hidden mb-2">
          {steps.map((step) => {
            const config = STEP_STATUS_CONFIG[step.status] ?? STEP_STATUS_CONFIG.pending
            const StepIcon = config.icon
            return (
              <div
                key={step.index}
                className="flex items-center gap-3 py-1.5 px-3 hover:bg-surface-hover/30 transition-colors"
              >
                <StepIcon className={cn('w-4 h-4 shrink-0', config.className)} />
                <span className="text-sm text-content-secondary flex-1 min-w-0 truncate">
                  <span className="font-medium text-white">{step.action}</span>
                  <span className="text-content-muted mx-1.5">&rarr;</span>
                  <span>{step.target}</span>
                </span>
                {step.durationMs !== undefined && (
                  <span className="text-xs text-content-muted font-mono shrink-0">
                    {step.durationMs}ms
                  </span>
                )}
                {step.error && (
                  <span className="text-xs text-red-400 truncate max-w-[200px]" title={step.error}>
                    {step.error}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {entry.qaError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mb-2 text-sm text-red-400">
          {entry.qaError}
        </div>
      )}

      {screenshots.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {screenshots.map((path, i) => (
            <a
              key={`${path}-${i}`}
              href={`/qa-evidence/${path}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={`/qa-evidence/${path}`}
                alt={`QA screenshot ${i + 1}`}
                className="h-16 w-24 object-cover rounded border border-white/10 hover:border-violet-400 transition-colors"
              />
            </a>
          ))}
        </div>
      )}
    </LogEntryWrapper>
  )
}

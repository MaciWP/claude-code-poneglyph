import type { TokenUsage } from '../types/chat'
import type { LearningEvent } from './LearningIndicator'
import type { ContextWindowState } from '../hooks/useContextWindow'
import { ProgressBar } from './ui/ProgressBar'
import { StatusDot } from './ui/StatusBadge'
import LearningIndicator from './LearningIndicator'
import ContextWindowIndicator from './ContextWindowIndicator'

interface SessionStats {
  messageCount: number
  toolUseCount: number
}

interface Props {
  sessionStats: SessionStats
  isConnected: boolean
  isProcessing: boolean
  responseTime?: number
  usage?: TokenUsage
  learningEvents?: LearningEvent[]
  contextWindow?: ContextWindowState
  isContextCompacting?: boolean
  contextCompactionSaved?: number | null
}

export default function StatsBar({
  sessionStats,
  isConnected,
  isProcessing,
  responseTime,
  usage,
  learningEvents = [],
  contextWindow,
  isContextCompacting = false,
  contextCompactionSaved,
}: Props) {
  const connectionStatus = isProcessing ? 'processing' : isConnected ? 'connected' : 'disconnected'
  const connectionLabel = isProcessing ? 'Processing' : isConnected ? 'Connected' : 'Disconnected'

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-surface-header border-b border-stroke-primary text-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <StatusDot status={connectionStatus} pulse={isProcessing} />
          <span className="text-content-muted">{connectionLabel}</span>
        </div>


        {learningEvents.length > 0 && (
          <LearningIndicator events={learningEvents} />
        )}
      </div>

      <div className="flex items-center gap-4">
        <StatItem label="Messages" value={sessionStats.messageCount.toString()} color="text-content-secondary" />
        <StatItem label="Tools" value={sessionStats.toolUseCount.toString()} color="text-blue-400" />
        {usage && (
          <>
            <StatItem label="Tokens" value={usage.totalTokens.toLocaleString()} color="text-purple-400" />
            {contextWindow ? (
              <div className="flex items-center gap-1.5">
                <span className="text-content-dimmed">Context:</span>
                <ContextWindowIndicator
                  state={contextWindow}
                  isCompacting={isContextCompacting}
                  compactionSaved={contextCompactionSaved}
                  size="sm"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-content-dimmed">Context:</span>
                <ProgressBar
                  value={usage.contextPercent}
                  color="auto"
                  size="sm"
                  showLabel
                  className="w-20"
                />
              </div>
            )}
          </>
        )}
        {responseTime !== undefined && responseTime > 0 && (
          <StatItem label="Last" value={`${(responseTime / 1000).toFixed(1)}s`} color="text-content-muted" />
        )}
      </div>
    </div>
  )
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-content-dimmed">{label}:</span>
      <span className={color}>{value}</span>
    </div>
  )
}

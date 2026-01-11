import type { LearningStats } from '../../../lib/api'
import { Icons } from '../../../lib/icons'
import { cn } from '../../../lib/utils'
import { Card, EmptyState } from '../../ui'
import MetricCard from '../MetricCard'

interface LearningTabProps {
  stats: LearningStats | null
  autoLearnEnabled: boolean
  onToggleAutoLearn: () => void
}

export default function LearningTab({
  stats,
  autoLearnEnabled,
  onToggleAutoLearn,
}: LearningTabProps) {
  return (
    <div className="space-y-4">
      {/* Auto-Learn Toggle */}
      <AutoLearnToggle
        enabled={autoLearnEnabled}
        onToggle={onToggleAutoLearn}
      />

      {/* Stats */}
      {stats && stats.totalExecutions > 0 && (
        <LearningStatsView stats={stats} />
      )}

      {(!stats || stats.totalExecutions === 0) && (
        <EmptyLearningState />
      )}
    </div>
  )
}

function AutoLearnToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <Card variant="outlined" padding="md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icons.brain className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-sm font-medium text-white">Auto-Learning</div>
            <div className="text-xs text-content-muted">
              Automatically learn from agent executions
            </div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            'w-12 h-6 rounded-full transition-colors relative',
            enabled ? 'bg-purple-500' : 'bg-surface-primary'
          )}
        >
          <div className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
            enabled ? 'left-7' : 'left-1'
          )} />
        </button>
      </div>
    </Card>
  )
}

function LearningStatsView({ stats }: { stats: LearningStats }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon="activity"
          label="Total Executions"
          value={stats.totalExecutions}
          color="blue"
        />
        <MetricCard
          icon="checkCircle"
          label="Success Rate"
          value={`${(stats.successRate * 100).toFixed(1)}%`}
          color="green"
        />
      </div>

      {Object.keys(stats.executionsByExpert).length > 0 && (
        <Card variant="outlined" padding="md">
          <h3 className="text-sm font-medium text-white mb-3">Executions by Expert</h3>
          <div className="space-y-3">
            {Object.entries(stats.executionsByExpert).map(([expertId, count]) => {
              const percentage = stats.totalExecutions > 0
                ? (count / stats.totalExecutions) * 100
                : 0
              return (
                <div key={expertId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-content-secondary">{expertId}</span>
                    <span className="text-white">{count}</span>
                  </div>
                  <div className="h-2 bg-surface-primary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </>
  )
}

function EmptyLearningState() {
  return (
    <EmptyState
      icon="sparkles"
      title="No learning data yet"
      description="Execute tasks with experts to start learning"
      variant="compact"
    />
  )
}

import type { LearningStats, ExpertInfo } from '../../../lib/api'
import { Icons } from '../../../lib/icons'
import { Card } from '../../ui/Card'
import MetricCard from '../MetricCard'
import ConfidenceBar from '../ConfidenceBar'

interface OverviewTabProps {
  stats: LearningStats | null
  experts: ExpertInfo[]
  avgConfidence: number
}

export default function OverviewTab({
  stats,
  experts,
  avgConfidence,
}: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon="brain"
          label="Experts"
          value={experts.length}
          color="purple"
        />
        <MetricCard
          icon="trendingUp"
          label="Avg Confidence"
          value={`${(avgConfidence * 100).toFixed(0)}%`}
          color="green"
        />
        <MetricCard
          icon="activity"
          label="Executions"
          value={stats?.totalExecutions ?? 0}
          color="blue"
        />
        <MetricCard
          icon="checkCircle"
          label="Success Rate"
          value={`${((stats?.successRate ?? 0) * 100).toFixed(0)}%`}
          color="emerald"
        />
      </div>

      {/* Experts Summary */}
      <Card variant="outlined" padding="md">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Icons.sparkles className="w-4 h-4 text-purple-400" />
          Active Experts
        </h3>
        {experts.length === 0 ? (
          <p className="text-sm text-content-muted">No experts configured</p>
        ) : (
          <div className="space-y-2">
            {experts.map(expert => (
              <div key={expert.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.cpu className="w-4 h-4 text-content-muted" />
                  <span className="text-sm text-white">{expert.domain}</span>
                </div>
                <ConfidenceBar value={expert.confidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Executions by Expert */}
      {stats && Object.keys(stats.executionsByExpert).length > 0 && (
        <Card variant="outlined" padding="md">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Icons.activity className="w-4 h-4 text-blue-400" />
            Executions by Expert
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.executionsByExpert).map(([expertId, count]) => (
              <div key={expertId} className="flex items-center justify-between">
                <span className="text-sm text-content-secondary">{expertId}</span>
                <span className="text-sm font-mono text-white">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

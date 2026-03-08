import { useMemo } from 'react'
import type { ExecutionTrace } from '@shared/types'
import { Icons } from '../../lib/icons'

function isToday(timestamp: string): boolean {
  const date = new Date(timestamp)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isThisWeek(timestamp: string): boolean {
  const date = new Date(timestamp)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return date >= weekAgo
}

interface CostSummary {
  todayCost: number
  todayCount: number
  weekCost: number
  weekCount: number
  totalCost: number
  totalCount: number
  avgCost: number
}

function computeCostSummary(traces: ExecutionTrace[]): CostSummary {
  let todayCost = 0
  let todayCount = 0
  let weekCost = 0
  let weekCount = 0
  let totalCost = 0

  for (const trace of traces) {
    totalCost += trace.totalCostUsd

    if (isToday(trace.timestamp)) {
      todayCost += trace.totalCostUsd
      todayCount++
    }

    if (isThisWeek(trace.timestamp)) {
      weekCost += trace.totalCostUsd
      weekCount++
    }
  }

  return {
    todayCost,
    todayCount,
    weekCost,
    weekCount,
    totalCost,
    totalCount: traces.length,
    avgCost: traces.length > 0 ? totalCost / traces.length : 0,
  }
}

interface StatCardProps {
  label: string
  cost: number
  count: number
}

function StatCard({ label, cost, count }: StatCardProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-content-muted">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-green-400">${cost.toFixed(2)}</span>
        <span className="text-xs text-content-dimmed">
          ({count} {count === 1 ? 'execution' : 'executions'})
        </span>
      </div>
    </div>
  )
}

interface CostTrackerProps {
  traces: ExecutionTrace[]
}

export function CostTracker({ traces }: CostTrackerProps): React.ReactElement {
  const summary = useMemo(() => computeCostSummary(traces), [traces])

  return (
    <div className="rounded-lg border border-stroke-primary bg-surface-secondary p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icons.trendingUp className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-medium text-content-secondary">Cost Overview</h3>
      </div>

      <div className="divide-y divide-stroke-primary">
        <StatCard label="Today" cost={summary.todayCost} count={summary.todayCount} />
        <StatCard label="This Week" cost={summary.weekCost} count={summary.weekCount} />
        <StatCard label="Total" cost={summary.totalCost} count={summary.totalCount} />
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-content-muted">Avg per Execution</span>
          <span className="text-sm font-medium text-green-400">${summary.avgCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

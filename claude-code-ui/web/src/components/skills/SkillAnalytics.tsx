import { useState, useEffect } from 'react'
import { Icons } from '../../lib/icons'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { ProgressBar } from '../ui/ProgressBar'
import { Skeleton } from '../ui/Skeleton'

interface SkillStats {
  total: number
  byType: Record<string, number>
  totalLines: number
  estimatedTokenBudget: number
}

interface SkillInfo {
  name: string
  lines: number
  type: string
}

const BUDGET_LIMIT = 15500

const TYPE_COLORS: Record<string, 'blue' | 'purple' | 'green' | 'gray'> = {
  'knowledge-base': 'blue',
  'capability-uplift': 'purple',
  'encoded-preference': 'green',
}

export function SkillAnalytics(): React.ReactElement {
  const [stats, setStats] = useState<SkillStats | null>(null)
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetch('/api/skills/stats', { signal: controller.signal }).then((r) => r.json()),
      fetch('/api/skills', { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([statsData, skillsData]: [SkillStats, { skills: SkillInfo[] }]) => {
        setStats(statsData)
        setSkills((skillsData.skills ?? []).sort((a: SkillInfo, b: SkillInfo) => b.lines - a.lines))
        setLoading(false)
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <p>Failed to load analytics</p>
        <p className="text-sm mt-1">Could not fetch skill stats from the server</p>
      </div>
    )
  }

  const budgetUsed = Math.round((stats.estimatedTokenBudget / BUDGET_LIMIT) * 100)

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Icons.chart className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-content-secondary uppercase tracking-wider">
          Skills Analytics
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card variant="default" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-content-muted">Total Skills</div>
          </div>
        </Card>
        <Card variant="default" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.totalLines.toLocaleString()}</div>
            <div className="text-xs text-content-muted">Total Lines</div>
          </div>
        </Card>
      </div>

      <Card variant="default" padding="md">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-content-muted">By Type</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <Badge key={type} color={TYPE_COLORS[type] ?? 'gray'} size="sm">
                {type} ({count})
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <Card variant="default" padding="md">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-content-muted">Token Budget</span>
            <span className="text-xs text-content-dimmed">
              ~{stats.estimatedTokenBudget.toLocaleString()} / {BUDGET_LIMIT.toLocaleString()} chars
            </span>
          </div>
          <ProgressBar
            value={Math.min(budgetUsed, 100)}
            color={budgetUsed > 80 ? 'red' : budgetUsed > 50 ? 'yellow' : 'green'}
            size="md"
            showLabel
          />
        </div>
      </Card>

      <Card variant="default" padding="md">
        <div className="space-y-2">
          <span className="text-xs text-content-muted">Top Skills (by line count)</span>
          <div className="space-y-1.5">
            {skills.slice(0, 10).map((skill, i) => (
              <div key={skill.name} className="flex items-center gap-2">
                <span className="text-xs text-content-dimmed w-5 text-right">{i + 1}.</span>
                <span className="text-xs text-content-primary flex-1 truncate">{skill.name}</span>
                <span className="text-xs text-content-muted tabular-nums">{skill.lines} lines</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

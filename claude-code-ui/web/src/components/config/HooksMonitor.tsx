import { useState, useEffect, useMemo } from 'react'
import { cn } from '../../lib/utils'
import { Icons } from '../../lib/icons'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import type { HookStats } from '@shared/types'

type BadgeColor = 'purple' | 'blue' | 'green' | 'orange' | 'gray' | 'red' | 'amber' | 'cyan'

interface HookConfig {
  name: string
  event: string
  command: string
  matcher?: string
  timeout?: number
}

const EVENT_BADGE_COLORS: Record<string, BadgeColor> = {
  PostToolUse: 'blue',
  PreToolUse: 'purple',
  Stop: 'orange',
  UserPromptSubmit: 'green',
  Notification: 'cyan',
}

function getEventColor(event: string): BadgeColor {
  return EVENT_BADGE_COLORS[event] ?? 'gray'
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function successRateColor(rate: number): string {
  if (rate >= 95) return 'text-green-400'
  if (rate >= 80) return 'text-yellow-400'
  return 'text-red-400'
}

function HookStatsRow({ hookStats }: { hookStats: HookStats }): React.ReactElement {
  const ratePercent = Math.round(hookStats.successRate * 100)
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-xs text-content-dimmed">
        Avg:{' '}
        <span className="text-content-muted font-medium">
          {formatDuration(hookStats.avgDurationMs)}
        </span>
      </span>
      <span className="text-xs text-content-dimmed">
        Runs: <span className="text-content-muted font-medium">{hookStats.executions}</span>
      </span>
      <span className="text-xs text-content-dimmed">
        Success:{' '}
        <span className={cn('font-medium', successRateColor(ratePercent))}>{ratePercent}%</span>
      </span>
    </div>
  )
}

interface HookCardProps {
  hook: HookConfig
  hookStats?: HookStats
}

function HookCard({ hook, hookStats }: HookCardProps): React.ReactElement {
  return (
    <Card variant="outlined" padding="sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icons.zap className="w-3.5 h-3.5 text-content-muted flex-shrink-0" />
            <span className="text-sm font-medium text-white truncate">{hook.name}</span>
          </div>
          <Badge color={getEventColor(hook.event)} size="xs">
            {hook.event}
          </Badge>
        </div>

        <p className="text-xs text-content-muted font-mono truncate">{hook.command}</p>

        <div className="flex items-center gap-3 flex-wrap text-xs text-content-dimmed">
          {hook.matcher && (
            <span>
              Matcher: <span className="text-content-muted">{hook.matcher}</span>
            </span>
          )}
          {hook.timeout && (
            <span>
              Timeout: <span className="text-content-muted">{hook.timeout}s</span>
            </span>
          )}
        </div>

        {hookStats ? (
          <HookStatsRow hookStats={hookStats} />
        ) : (
          <span className="text-[10px] text-content-dimmed italic">No stats yet</span>
        )}
      </div>
    </Card>
  )
}

export function HooksMonitor(): React.ReactElement {
  const [hooks, setHooks] = useState<HookConfig[]>([])
  const [stats, setStats] = useState<HookStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    Promise.allSettled([
      fetch('/api/config/hooks', { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }),
      fetch('/api/config/hooks/stats', { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }),
    ])
      .then(([hooksResult, statsResult]) => {
        if (hooksResult.status === 'fulfilled') {
          setHooks((hooksResult.value as { hooks: HookConfig[] }).hooks ?? [])
        }
        if (statsResult.status === 'fulfilled') {
          setStats((statsResult.value as { stats: HookStats[] }).stats ?? [])
        }
        setLoading(false)
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  const statsMap = useMemo(() => {
    const map = new Map<string, HookStats>()
    for (const s of stats) {
      map.set(s.name, s)
    }
    return map
  }, [stats])

  const groupedByEvent = useMemo(() => {
    const groups = new Map<string, HookConfig[]>()
    for (const hook of hooks) {
      const existing = groups.get(hook.event) ?? []
      existing.push(hook)
      groups.set(hook.event, existing)
    }
    return groups
  }, [hooks])

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return <EmptyState icon="alertCircle" title="Failed to load hooks" description={error} />
  }

  if (hooks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="anchor"
          title="No hooks configured"
          description="Hooks will appear here when configured in .claude/hooks/"
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-stroke-primary">
        <span className="text-sm font-semibold text-content-secondary uppercase tracking-wider">
          Hooks ({hooks.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Array.from(groupedByEvent.entries()).map(([event, eventHooks]) => (
          <div key={event} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge color={getEventColor(event)} size="sm">
                {event}
              </Badge>
              <span className="text-xs text-content-dimmed">
                {eventHooks.length} hook{eventHooks.length > 1 ? 's' : ''}
              </span>
            </div>

            {eventHooks.map((hook) => (
              <HookCard key={hook.name} hook={hook} hookStats={statsMap.get(hook.name)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

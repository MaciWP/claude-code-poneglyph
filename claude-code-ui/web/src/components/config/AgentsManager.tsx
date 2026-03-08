import { useState, useEffect, useMemo } from 'react'
import { cn } from '../../lib/utils'
import { Icons } from '../../lib/icons'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import type { ClaudeConfigItem } from '@shared/types'

type BadgeColor = 'purple' | 'blue' | 'green' | 'orange' | 'gray'

const MODEL_BADGE_COLORS: Record<string, BadgeColor> = {
  opus: 'purple',
  sonnet: 'blue',
  haiku: 'green',
}

function getModelColor(model?: string): BadgeColor {
  if (!model) return 'gray'
  const lower = model.toLowerCase()
  for (const [key, color] of Object.entries(MODEL_BADGE_COLORS)) {
    if (lower.includes(key)) return color
  }
  return 'gray'
}

export function AgentsManager(): React.ReactElement {
  const [agents, setAgents] = useState<ClaudeConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/claude-config', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { agents: ClaudeConfigItem[] }) => {
        setAgents(data.agents ?? [])
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

  const filtered = useMemo(() => {
    if (!search) return agents
    const lower = search.toLowerCase()
    return agents.filter(
      (a) => a.name.toLowerCase().includes(lower) || a.description.toLowerCase().includes(lower)
    )
  }, [agents, search])

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return <EmptyState icon="alertCircle" title="Failed to load agents" description={error} />
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-3 space-y-2 border-b border-stroke-primary">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-content-secondary uppercase tracking-wider">
            Agents ({agents.length})
          </span>
        </div>
        <div className="relative">
          <Icons.search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted" />
          <input
            type="text"
            placeholder="Filter agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-input border border-stroke-primary rounded-md text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 && (
          <EmptyState
            icon="bot"
            title="No agents found"
            description={search ? 'Try adjusting your filter' : 'No agents configured'}
            variant="compact"
          />
        )}

        {filtered.map((agent) => {
          const isExpanded = expandedAgent === agent.name

          return (
            <Card
              key={agent.name}
              variant="outlined"
              padding="sm"
              className="cursor-pointer hover:border-purple-500/50"
              onClick={() => setExpandedAgent(isExpanded ? null : agent.name)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icons.bot className="w-4 h-4 text-content-muted flex-shrink-0" />
                    <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                  </div>
                  {agent.model && (
                    <Badge color={getModelColor(agent.model)} size="xs">
                      {agent.model}
                    </Badge>
                  )}
                </div>

                <p className={cn('text-xs text-content-muted', isExpanded ? '' : 'line-clamp-2')}>
                  {agent.description}
                </p>

                {agent.tools && agent.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {agent.tools.map((tool) => (
                      <Badge key={tool} color="gray" size="xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                )}

                {agent.triggers && agent.triggers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-content-dimmed mr-1">Keywords:</span>
                    {agent.triggers.slice(0, isExpanded ? undefined : 5).map((kw) => (
                      <Badge key={kw} color="cyan" size="xs">
                        {kw}
                      </Badge>
                    ))}
                    {!isExpanded && agent.triggers.length > 5 && (
                      <span className="text-[10px] text-content-dimmed">
                        +{agent.triggers.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

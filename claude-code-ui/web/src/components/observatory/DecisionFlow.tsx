import { useState, useEffect } from 'react'
import { useTraceStream } from '../../hooks/useTraceStream'
import type { ExecutionTrace, AgentTrace } from '../../hooks/useTraceStream'
import type { TraceEvent } from '@shared/types'
import { cn } from '../../lib/utils'
import { Icons } from '../../lib/icons'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}m ${remaining}s`
}

function scoreColor(score: number): string {
  if (score < 50) return 'text-red-400'
  if (score <= 70) return 'text-yellow-400'
  return 'text-green-400'
}

type BadgeColor =
  | 'purple'
  | 'blue'
  | 'green'
  | 'orange'
  | 'gray'
  | 'red'
  | 'amber'
  | 'cyan'
  | 'pink'

const SKILL_COLORS: BadgeColor[] = ['purple', 'blue', 'cyan', 'pink', 'orange']

function skillColor(index: number): BadgeColor {
  return SKILL_COLORS[index % SKILL_COLORS.length]
}

interface AgentStatusIconProps {
  status: AgentTrace['status']
}

function AgentStatusIcon({ status }: AgentStatusIconProps) {
  switch (status) {
    case 'pending':
      return <Icons.dot className="w-4 h-4 text-gray-500" />
    case 'active':
      return <Icons.play className="w-4 h-4 text-blue-400 animate-pulse" />
    case 'completed':
      return <Icons.check className="w-4 h-4 text-green-400" />
    case 'failed':
      return <Icons.x className="w-4 h-4 text-red-400" />
  }
}

const AGENT_STATUS_TEXT: Record<AgentTrace['status'], string> = {
  pending: 'text-gray-500',
  active: 'text-blue-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
}

interface AgentRowProps {
  agent: AgentTrace
}

function AgentRow({ agent }: AgentRowProps) {
  const durationLabel = agent.durationMs > 0 ? formatDuration(agent.durationMs) : null

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-surface-hover transition-colors">
      <AgentStatusIcon status={agent.status} />
      <span className={cn('text-sm font-medium', AGENT_STATUS_TEXT[agent.status])}>
        {agent.type}
      </span>
      {durationLabel && <span className="text-xs text-content-dimmed">({durationLabel})</span>}
      <span className="text-xs text-content-muted truncate flex-1">- {agent.task}</span>
      {agent.error && (
        <span className="text-xs text-red-400 truncate max-w-[200px]">{agent.error}</span>
      )}
    </div>
  )
}

const TRACE_STATUS_STYLES: Record<ExecutionTrace['status'], string> = {
  running: 'border-blue-500/30 bg-blue-500/5',
  completed: 'border-stroke-primary bg-surface-secondary',
  failed: 'border-red-500/30 bg-red-500/5',
}

interface TraceCardProps {
  trace: ExecutionTrace
  defaultExpanded: boolean
}

function TraceCard({ trace, defaultExpanded }: TraceCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const ChevronIcon = expanded ? Icons.chevronDown : Icons.chevronRight

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-200',
        TRACE_STATUS_STYLES[trace.status]
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-surface-hover/50 transition-colors rounded-t-lg"
      >
        <ChevronIcon className="w-4 h-4 text-content-muted flex-shrink-0" />
        <span className="text-sm text-content-primary truncate flex-1">{trace.prompt}</span>
        <Badge
          color={
            trace.status === 'running' ? 'blue' : trace.status === 'completed' ? 'green' : 'red'
          }
          size="xs"
        >
          {trace.status}
        </Badge>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3 animate-fade-in">
          <TraceMetrics trace={trace} />
          <TraceSkills skills={trace.skillsLoaded} />
          <TraceAgents agents={trace.agents} />
        </div>
      )}
    </div>
  )
}

interface TraceMetricsProps {
  trace: ExecutionTrace
}

function TraceMetrics({ trace }: TraceMetricsProps) {
  return (
    <div className="flex items-center gap-4 text-xs flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-content-dimmed">Prompt Score:</span>
        <span className={cn('font-medium', scoreColor(trace.promptScore))}>
          {trace.promptScore}/100
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-content-dimmed">Complexity:</span>
        <span className={cn('font-medium', scoreColor(trace.complexityScore))}>
          {trace.complexityScore}/100
        </span>
      </div>
      {trace.durationMs > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-content-dimmed">Duration:</span>
          <span className="text-content-secondary font-medium">
            {formatDuration(trace.durationMs)}
          </span>
        </div>
      )}
      {trace.totalTokens > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-content-dimmed">Tokens:</span>
          <span className="text-purple-400 font-medium">{trace.totalTokens.toLocaleString()}</span>
        </div>
      )}
      {trace.totalCostUsd > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-content-dimmed">Cost:</span>
          <span className="text-green-400 font-medium">${trace.totalCostUsd.toFixed(4)}</span>
        </div>
      )}
    </div>
  )
}

interface TraceSkillsProps {
  skills: string[]
}

function TraceSkills({ skills }: TraceSkillsProps) {
  if (skills.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-content-dimmed">Skills:</span>
      {skills.map((s, i) => (
        <Badge key={s} color={skillColor(i)} size="xs">
          {s}
        </Badge>
      ))}
    </div>
  )
}

interface TraceAgentsProps {
  agents: AgentTrace[]
}

function TraceAgents({ agents }: TraceAgentsProps) {
  if (agents.length === 0) return null

  return (
    <div>
      <span className="text-xs text-content-dimmed mb-1 block">Agents:</span>
      <div className="space-y-0.5">
        {agents.map((agent) => (
          <AgentRow key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  )
}

export function DecisionFlow(): React.ReactElement {
  const { activeTraces, completedTraces, handleTraceEvent } = useTraceStream()

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.DEV ? 'localhost:8080' : window.location.host
    const ws = new WebSocket(`${protocol}//${host}/ws`)

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as { type?: string; trace?: unknown }
        if (msg.type?.startsWith('trace:')) {
          handleTraceEvent(msg as TraceEvent)
        }
      } catch {
        /* ignore non-JSON */
      }
    }

    return () => ws.close()
  }, [handleTraceEvent])

  const hasTraces = activeTraces.length > 0 || completedTraces.length > 0

  if (!hasTraces) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="activity"
          title="No active traces"
          description="Execute a prompt to see the decision flow."
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wider mb-2">
        Observatory
      </h2>
      {activeTraces.map((trace) => (
        <TraceCard key={trace.id} trace={trace} defaultExpanded />
      ))}
      {completedTraces.length > 0 && activeTraces.length > 0 && (
        <div className="h-px bg-stroke-primary my-2" />
      )}
      {completedTraces.map((trace) => (
        <TraceCard key={trace.id} trace={trace} defaultExpanded={false} />
      ))}
    </div>
  )
}

import { useState } from 'react'
import type { ExecutionTrace, AgentTrace } from '@shared/types'
import { cn } from '../../lib/utils'
import { Icons } from '../../lib/icons'
import { EmptyState } from '../ui/EmptyState'

const AGENT_COLORS: Record<string, { bar: string; text: string }> = {
  builder: { bar: 'bg-blue-500', text: 'text-blue-400' },
  scout: { bar: 'bg-green-500', text: 'text-green-400' },
  reviewer: { bar: 'bg-purple-500', text: 'text-purple-400' },
  'error-analyzer': { bar: 'bg-red-500', text: 'text-red-400' },
  planner: { bar: 'bg-yellow-500', text: 'text-yellow-400' },
}

const DEFAULT_COLOR = { bar: 'bg-gray-500', text: 'text-gray-400' }

function getAgentColor(type: string): { bar: string; text: string } {
  return AGENT_COLORS[type] ?? DEFAULT_COLOR
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}m ${remaining}s`
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

interface AgentBarProps {
  agent: AgentTrace
  traceStart: number
  traceDuration: number
}

function AgentBar({ agent, traceStart, traceDuration }: AgentBarProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const color = getAgentColor(agent.type)

  const agentStart = new Date(agent.startedAt).getTime()
  const offsetMs = Math.max(0, agentStart - traceStart)
  const leftPercent = traceDuration > 0 ? (offsetMs / traceDuration) * 100 : 0
  const widthPercent =
    traceDuration > 0 ? Math.max(2, (agent.durationMs / traceDuration) * 100) : 100

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-1 hover:bg-surface-hover/50 rounded px-1 transition-colors group"
      >
        <span className={cn('text-xs font-medium w-28 text-left truncate', color.text)}>
          {agent.type}
        </span>
        <div className="flex-1 h-5 bg-surface-primary rounded-sm relative overflow-hidden">
          <div
            className={cn(
              'absolute top-0 h-full rounded-sm opacity-80 group-hover:opacity-100 transition-opacity',
              color.bar
            )}
            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
          />
        </div>
        <span className="text-xs text-content-dimmed w-14 text-right">
          {agent.durationMs > 0 ? formatDuration(agent.durationMs) : '--'}
        </span>
      </button>

      {expanded && (
        <div className="ml-32 mr-14 mb-2 p-2 rounded bg-surface-primary border border-stroke-primary text-xs space-y-1 animate-fade-in">
          <div>
            <span className="text-content-dimmed">Task: </span>
            <span className="text-content-secondary">{agent.task}</span>
          </div>
          {agent.result && (
            <div>
              <span className="text-content-dimmed">Result: </span>
              <span className="text-content-secondary line-clamp-3">{agent.result}</span>
            </div>
          )}
          {agent.error && (
            <div>
              <span className="text-content-dimmed">Error: </span>
              <span className="text-red-400">{agent.error}</span>
            </div>
          )}
          {agent.tokensUsed > 0 && (
            <div>
              <span className="text-content-dimmed">Tokens: </span>
              <span className="text-purple-400">{agent.tokensUsed.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TimelineSessionProps {
  trace: ExecutionTrace
}

function TimelineSession({ trace }: TimelineSessionProps): React.ReactElement {
  const traceStart = new Date(trace.timestamp).getTime()
  const traceDuration = trace.durationMs > 0 ? trace.durationMs : 1

  const agentsWithTiming = trace.agents.filter((a) => a.startedAt)

  return (
    <div className="rounded-lg border border-stroke-primary bg-surface-secondary p-3 space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <Icons.clock className="w-3.5 h-3.5 text-content-muted" />
        <span className="text-sm text-content-primary truncate flex-1">{trace.prompt}</span>
        <span className="text-xs text-content-dimmed whitespace-nowrap">
          {timeAgo(trace.timestamp)}
        </span>
      </div>

      {agentsWithTiming.length > 0 ? (
        agentsWithTiming.map((agent) => (
          <AgentBar
            key={agent.id}
            agent={agent}
            traceStart={traceStart}
            traceDuration={traceDuration}
          />
        ))
      ) : (
        <div className="text-xs text-content-muted py-1 pl-1">No agent data available</div>
      )}
    </div>
  )
}

interface AgentTimelineProps {
  traces: ExecutionTrace[]
}

export function AgentTimeline({ traces }: AgentTimelineProps): React.ReactElement {
  if (traces.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="activity"
          title="No timeline data"
          description="Completed executions will appear here as a timeline."
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(AGENT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded-sm', color.bar)} />
            <span className="text-xs text-content-muted">{type}</span>
          </div>
        ))}
      </div>

      {traces.map((trace) => (
        <TimelineSession key={trace.id} trace={trace} />
      ))}
    </div>
  )
}

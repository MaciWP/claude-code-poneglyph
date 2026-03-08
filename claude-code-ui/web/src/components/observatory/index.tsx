import { useState, useEffect, useCallback } from 'react'
import type { ExecutionTrace, TraceEvent } from '@shared/types'
import { useTraceStream } from '../../hooks/useTraceStream'
import { cn } from '../../lib/utils'
import { DecisionFlow } from './DecisionFlow'
import { AgentTimeline } from './AgentTimeline'
import { MetricsCharts } from './MetricsCharts'
import { CostTracker } from './CostTracker'

type ObservatoryTab = 'flow' | 'timeline' | 'metrics'

const TAB_LABELS: Record<ObservatoryTab, string> = {
  flow: 'Decision Flow',
  timeline: 'Agent Timeline',
  metrics: 'Metrics',
}

const TABS: ObservatoryTab[] = ['flow', 'timeline', 'metrics']

export function Observatory(): React.ReactElement {
  const { completedTraces, handleTraceEvent } = useTraceStream()
  const [activeTab, setActiveTab] = useState<ObservatoryTab>('flow')
  const [historicalTraces, setHistoricalTraces] = useState<ExecutionTrace[]>([])

  useEffect(() => {
    const apiBase = import.meta.env.DEV ? 'http://localhost:8080' : ''
    fetch(`${apiBase}/api/traces?limit=100`)
      .then((r) => r.json())
      .then((data: { traces?: ExecutionTrace[] }) => {
        setHistoricalTraces(data.traces ?? [])
      })
      .catch(() => {})
  }, [])

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

  const allCompletedTraces = useCallback((): ExecutionTrace[] => {
    const streamIds = new Set(completedTraces.map((t) => t.id))
    const deduped = historicalTraces.filter((t) => !streamIds.has(t.id))
    return [...completedTraces, ...deduped]
  }, [completedTraces, historicalTraces])

  return (
    <div className="h-full flex flex-col bg-surface-tertiary">
      <div className="flex overflow-x-auto border-b border-stroke-primary">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
              activeTab === tab
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-content-muted hover:text-white'
            )}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div key={activeTab} className="animate-slide-up">
          {activeTab === 'flow' && <DecisionFlow />}
          {activeTab === 'timeline' && <AgentTimeline traces={allCompletedTraces()} />}
          {activeTab === 'metrics' && (
            <div className="space-y-4">
              <CostTracker traces={allCompletedTraces()} />
              <MetricsCharts traces={allCompletedTraces()} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

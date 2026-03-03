import { useMemo } from 'react'
import type { QAResult } from '../../../hooks/useQADashboard'
import { Icons } from '../../../lib/icons'
import { Card, Badge, Button, EmptyState } from '../../ui'
import QAStoryCard from './QAStoryCard'
import QAStepRow from './QAStepRow'

// =============================================================================
// TYPES
// =============================================================================

interface QATabProps {
  stories: string[]
  results: QAResult[]
  activeRun: QAResult | null
  isLoading: boolean
  isRunning: boolean
  error: string | null
  onRunStory: (name: string) => Promise<void>
  onCancelRun: (id: string) => Promise<void>
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusColor(status: QAResult['status']): 'green' | 'red' | 'blue' | 'amber' {
  switch (status) {
    case 'passed':
      return 'green'
    case 'failed':
      return 'red'
    case 'running':
      return 'blue'
    case 'cancelled':
      return 'amber'
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function QATab({
  stories,
  results,
  activeRun,
  isLoading,
  isRunning,
  error,
  onRunStory,
  onCancelRun,
}: QATabProps): JSX.Element {
  const lastResultByStory = useMemo(() => {
    const map = new Map<string, QAResult>()
    const sorted = [...results].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
    for (const result of sorted) {
      if (!map.has(result.storyName)) {
        map.set(result.storyName, result)
      }
    }
    return map
  }, [results])

  const completedResults = useMemo(
    () =>
      results
        .filter((r) => r.status !== 'running')
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 5),
    [results]
  )

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
          <Icons.error className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stories Section */}
      <Card variant="outlined" padding="none">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Icons.clipboard className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-white">QA Stories</h3>
            <Badge color="gray" size="xs">
              {stories.length}
            </Badge>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icons.play className="w-3.5 h-3.5" />}
            onClick={() => onRunStory('all')}
            disabled={isRunning}
          >
            Run All
          </Button>
        </div>

        {isLoading && stories.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Icons.loader className="w-5 h-5 text-content-muted animate-spin" />
          </div>
        ) : stories.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No QA stories"
            description="QA stories will appear here when configured"
            variant="compact"
          />
        ) : (
          <div>
            {stories.map((name) => (
              <QAStoryCard
                key={name}
                name={name}
                lastResult={lastResultByStory.get(name) ?? null}
                isRunning={activeRun?.storyName === name}
                onRun={() => onRunStory(name)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Active Run Section */}
      {activeRun && (
        <Card variant="outlined" padding="none">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Icons.loader className="w-4 h-4 text-blue-400 animate-spin" />
              <h3 className="text-sm font-medium text-white">{activeRun.storyName}</h3>
              <Badge color="blue" size="xs">
                RUNNING
              </Badge>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Icons.circleStop className="w-3.5 h-3.5" />}
              onClick={() => onCancelRun(activeRun.id)}
              className="text-red-400 hover:text-red-300"
            >
              Cancel
            </Button>
          </div>

          <div className="divide-y divide-white/5">
            {activeRun.steps.length === 0 ? (
              <div className="px-3 py-4 text-sm text-content-muted text-center">
                Waiting for steps...
              </div>
            ) : (
              activeRun.steps.map((step) => (
                <QAStepRow key={step.index} step={step} storyName={activeRun.storyName} />
              ))
            )}
          </div>

          {activeRun.summary && (
            <div className="px-3 py-2 border-t border-white/10 text-xs text-content-muted">
              {activeRun.summary}
            </div>
          )}
        </Card>
      )}

      {/* History Section */}
      <Card variant="outlined" padding="none">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
          <Icons.clock className="w-4 h-4 text-content-muted" />
          <h3 className="text-sm font-medium text-white">History</h3>
          <Badge color="gray" size="xs">
            Last 5
          </Badge>
        </div>

        {completedResults.length === 0 ? (
          <EmptyState
            icon="clock"
            title="No completed runs"
            description="Run a QA story to see results here"
            variant="compact"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-content-muted">
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Story</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Steps</th>
                </tr>
              </thead>
              <tbody>
                {completedResults.map((result) => {
                  const passedSteps = result.steps.filter((s) => s.status === 'passed').length
                  return (
                    <tr
                      key={result.id}
                      className="border-b border-white/5 last:border-b-0 hover:bg-surface-hover/30 transition-colors"
                    >
                      <td className="px-3 py-2 text-xs text-content-muted font-mono whitespace-nowrap">
                        {formatDate(result.startedAt)}
                      </td>
                      <td className="px-3 py-2 text-white truncate max-w-[200px]">
                        {result.storyName}
                      </td>
                      <td className="px-3 py-2">
                        <Badge color={getStatusColor(result.status)} size="xs">
                          {result.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-content-muted font-mono">
                        {passedSteps}/{result.steps.length}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

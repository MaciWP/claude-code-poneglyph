import { useState, useEffect, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { Icons } from '../../lib/icons'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { ProgressBar } from '../ui/ProgressBar'

interface EvalCase {
  skills: string[]
  query: string
  expected_behavior: string[]
}

interface EvalResult {
  input: string
  expected: string[]
  actual: string[]
  passed: boolean
  reason?: string
}

interface EvalReport {
  skillName: string
  totalCases: number
  passed: number
  failed: number
  results: EvalResult[]
}

interface EvalRunnerProps {
  skillName: string | null
}

export function EvalRunner({ skillName }: EvalRunnerProps): React.ReactElement {
  const [cases, setCases] = useState<EvalCase[]>([])
  const [report, setReport] = useState<EvalReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [hasEval, setHasEval] = useState(false)

  useEffect(() => {
    if (!skillName) return

    setLoading(true)
    setReport(null)
    const controller = new AbortController()

    fetch(`/api/skills/${skillName}/eval`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { cases: EvalCase[] }) => {
        const evalCases = data.cases ?? []
        setCases(evalCases)
        setHasEval(evalCases.length > 0)
        setLoading(false)
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setCases([])
          setHasEval(false)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [skillName])

  const runEval = useCallback(async () => {
    if (!skillName) return

    setRunning(true)
    try {
      const res = await fetch(`/api/skills/${skillName}/eval/run`, { method: 'POST' })
      const data = (await res.json()) as EvalReport
      setReport(data)
    } catch (error) {
      if (error instanceof Error) {
        console.error('Eval failed:', error.message)
      }
    } finally {
      setRunning(false)
    }
  }, [skillName])

  if (!skillName) {
    return (
      <EmptyState
        icon="target"
        title="No skill selected"
        description="Select a skill to run evaluations"
        variant="default"
      />
    )
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    )
  }

  if (!hasEval) {
    return (
      <EmptyState
        icon="target"
        title="No eval configured"
        description={`No evaluation cases found for "${skillName}". Add JSON files to .claude/skills/${skillName}/evals/`}
        variant="default"
      />
    )
  }

  const passPercentage = report ? Math.round((report.passed / report.totalCases) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stroke-primary">
        <div className="flex items-center gap-2">
          <Icons.target className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">Eval: {skillName}</span>
        </div>

        <Button
          variant="primary"
          size="sm"
          loading={running}
          onClick={runEval}
          icon={<Icons.play className="w-3.5 h-3.5" />}
        >
          Run Eval
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!report && (
          <Card variant="outlined" padding="md">
            <div className="text-xs text-content-muted">
              {cases.length} eval case{cases.length !== 1 ? 's' : ''} available. Click "Run Eval" to
              execute.
            </div>
          </Card>
        )}

        {report && (
          <>
            <Card variant="default" padding="md">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Results</span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      passPercentage === 100
                        ? 'text-green-400'
                        : passPercentage >= 70
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    )}
                  >
                    {report.passed}/{report.totalCases} passed
                  </span>
                </div>
                <ProgressBar
                  value={passPercentage}
                  color={passPercentage === 100 ? 'green' : passPercentage >= 70 ? 'yellow' : 'red'}
                  size="sm"
                  showLabel
                />
              </div>
            </Card>

            <div className="space-y-2">
              {report.results.map((result, i) => (
                <Card
                  key={i}
                  variant="outlined"
                  padding="sm"
                  className={cn(
                    result.passed ? 'border-green-500/20' : 'border-red-500/20 bg-red-500/5'
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      {result.passed ? (
                        <Icons.checkCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Icons.alertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-content-primary">"{result.input}"</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.expected.map((exp, j) => (
                            <span
                              key={j}
                              className="text-[10px] text-content-dimmed bg-surface-input px-1.5 py-0.5 rounded"
                            >
                              {exp}
                            </span>
                          ))}
                        </div>
                        {result.actual.length > 0 && (
                          <p className="text-[10px] text-content-muted mt-1">
                            {result.actual.join('; ')}
                          </p>
                        )}
                        {result.reason && (
                          <p className="text-[10px] text-red-400 mt-1">{result.reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

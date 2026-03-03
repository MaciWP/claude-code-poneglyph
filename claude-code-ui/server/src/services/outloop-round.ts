import type { OutloopRun, OutloopRound } from '../../../shared/types'
import type { BlueprintRun } from '@shared/types/blueprint'
import { startBlueprint } from './blueprint-executor'
import { runQualityGate } from './hook-runner'
import type { HookResult } from './hook-runner'

function buildPromptWithFeedback(run: OutloopRun, roundNum: number): string {
  if (roundNum <= 1) return run.prompt

  const prevRound = run.rounds[roundNum - 2]
  const feedback = prevRound?.error || prevRound?.output
  if (!feedback) return run.prompt

  return `${run.prompt}\n\n## Previous Round Feedback\n\nThe previous attempt failed:\n${feedback}\n\nPlease fix the issues.`
}

function extractQualityResults(results: HookResult[]): {
  testsPassed: boolean
  typecheckPassed: boolean
} {
  return {
    testsPassed: results.some((r) => r.hookName.includes('test') && r.passed),
    typecheckPassed: results.some((r) => r.hookName.includes('typecheck') && r.passed),
  }
}

function formatFailedResults(results: HookResult[]): string {
  return results
    .filter((r) => !r.passed)
    .map((r) => `${r.hookName}: ${r.stderr?.slice(0, 500) || 'failed'}`)
    .join('\n')
}

function formatBlueprintErrors(blueprintRun: BlueprintRun): string {
  return blueprintRun.nodeRuns
    .filter((n) => n.status === 'failed')
    .map((n) => `${n.nodeId}: ${n.error || 'failed'}`)
    .join('\n')
}

function formatBlueprintOutput(blueprintRun: BlueprintRun): string {
  return blueprintRun.nodeRuns
    .filter((n) => n.output)
    .map((n) => `${n.nodeId}: ${n.output?.slice(0, 500)}`)
    .join('\n')
}

export async function executeRound(
  run: OutloopRun,
  roundNum: number,
  blueprintId: string,
  sessionId: string
): Promise<OutloopRound> {
  const round: OutloopRound = {
    round: roundNum,
    status: 'running',
    startedAt: new Date().toISOString(),
  }

  try {
    const prompt = buildPromptWithFeedback(run, roundNum)
    const variables = { task: prompt, workDir: run.workDir }
    const blueprintRun = await startBlueprint(blueprintId, variables, sessionId, run.workDir)
    round.blueprintRunId = blueprintRun.id

    if (blueprintRun.status === 'failed') {
      round.status = 'failed'
      round.error = formatBlueprintErrors(blueprintRun)
      round.completedAt = new Date().toISOString()
      return round
    }

    const qualityResult = await runQualityGate(run.workDir)
    const quality = extractQualityResults(qualityResult.results)
    round.testsPassed = quality.testsPassed
    round.typecheckPassed = quality.typecheckPassed

    if (qualityResult.passed) {
      round.status = 'passed'
      round.output = formatBlueprintOutput(blueprintRun)
    } else {
      round.status = 'failed'
      round.error = formatFailedResults(qualityResult.results)
    }
  } catch (err) {
    round.status = 'failed'
    round.error = err instanceof Error ? err.message : String(err)
  }

  round.completedAt = new Date().toISOString()
  return round
}

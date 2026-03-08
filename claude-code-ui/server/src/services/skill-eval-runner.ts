import { readdir } from 'fs/promises'
import { join } from 'path'
import { logger } from '../logger'

const log = logger.child('skill-eval-runner')

interface EvalCase {
  skills: string[]
  query: string
  expected_behavior: string[]
}

export interface EvalResult {
  input: string
  expected: string[]
  actual: string[]
  passed: boolean
  reason?: string
}

export interface SkillEvalReport {
  skillName: string
  totalCases: number
  passed: number
  failed: number
  results: EvalResult[]
}

function findMatchedKeywords(skillKeywords: string[], query: string): string[] {
  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/)

  return skillKeywords.filter((kw) => {
    const kwLower = kw.toLowerCase()
    return queryWords.includes(kwLower) || queryLower.includes(kwLower)
  })
}

function evaluateCase(evalCase: EvalCase, skillName: string, skillKeywords: string[]): EvalResult {
  const matchedKeywords = findMatchedKeywords(skillKeywords, evalCase.query)
  const skillActivated = matchedKeywords.length > 0
  const shouldActivate = evalCase.skills.includes(skillName)
  const passed = skillActivated === shouldActivate

  return {
    input: evalCase.query,
    expected: evalCase.expected_behavior,
    actual: skillActivated
      ? [`Activated via keywords: ${matchedKeywords.join(', ')}`]
      : ['Not activated - no keyword match'],
    passed,
    reason: passed ? undefined : buildFailureReason(shouldActivate, matchedKeywords),
  }
}

function buildFailureReason(shouldActivate: boolean, matchedKeywords: string[]): string {
  if (shouldActivate) {
    return 'Skill should activate but no keywords matched for query'
  }
  return `Skill should not activate but keywords matched: ${matchedKeywords.join(', ')}`
}

function emptyReport(skillName: string): SkillEvalReport {
  return { skillName, totalCases: 0, passed: 0, failed: 0, results: [] }
}

async function tryParseEvalFile(
  filePath: string,
  skillName: string,
  fileName: string
): Promise<EvalCase | null> {
  try {
    const evalFile = Bun.file(filePath)
    const data = (await evalFile.json()) as EvalCase
    if (data.skills && data.query && data.expected_behavior) {
      return data
    }
    return null
  } catch (error) {
    log.warn('Failed to parse eval file', { skillName, file: fileName, error: String(error) })
    return null
  }
}

export class SkillEvalRunner {
  constructor(private skillsDir: string) {}

  async loadEvalCases(skillName: string): Promise<EvalCase[]> {
    const evalDir = join(this.skillsDir, skillName, 'evals')

    try {
      const files = await readdir(evalDir)
      const jsonFiles = files.filter((f) => f.endsWith('.json'))
      const parsed = await Promise.all(
        jsonFiles.map((f) => tryParseEvalFile(join(evalDir, f), skillName, f))
      )
      return parsed.filter((c): c is EvalCase => c !== null)
    } catch {
      return []
    }
  }

  async runEval(skillName: string, skillKeywords: string[]): Promise<SkillEvalReport> {
    const cases = await this.loadEvalCases(skillName)

    if (cases.length === 0) return emptyReport(skillName)

    const results = cases.map((c) => evaluateCase(c, skillName, skillKeywords))
    const passed = results.filter((r) => r.passed).length

    const report: SkillEvalReport = {
      skillName,
      totalCases: cases.length,
      passed,
      failed: cases.length - passed,
      results,
    }

    log.info('Eval completed', {
      skillName,
      total: report.totalCases,
      passed: report.passed,
      failed: report.failed,
    })

    return report
  }

  async getEvalJson(skillName: string): Promise<EvalCase[]> {
    return this.loadEvalCases(skillName)
  }
}

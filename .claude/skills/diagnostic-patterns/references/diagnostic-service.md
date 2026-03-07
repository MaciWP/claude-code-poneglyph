# Diagnostic Service

Complete service class that orchestrates error diagnosis, stack analysis, root cause analysis, and report generation.

## Interfaces

```typescript
interface DiagnosticContext {
  requestId?: string
  userId?: string
  endpoint?: string
  method?: string
  input?: unknown
  environment: {
    nodeVersion: string
    bunVersion: string
    platform: string
    memory: NodeJS.MemoryUsage
  }
  timestamp: string
}

interface DiagnosticReport {
  id: string
  error: ErrorDiagnosis
  stackAnalysis: StackAnalysis
  context: DiagnosticContext
  rootCause?: RootCauseAnalysis
  recommendations: string[]
}
```

## DiagnosticService Class

```typescript
import { existsSync, readFileSync } from 'fs'

class DiagnosticService {
  private reports: Map<string, DiagnosticReport> = new Map()

  diagnose(
    error: Error,
    context: Partial<DiagnosticContext> = {}
  ): DiagnosticReport {
    const id = crypto.randomUUID()

    const fullContext: DiagnosticContext = {
      ...context,
      environment: {
        nodeVersion: process.version,
        bunVersion: Bun.version,
        platform: process.platform,
        memory: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    }

    const diagnosis = diagnoseError(error, context.input)
    const stackAnalysis = analyzeStackTrace(error.stack || '')

    const report: DiagnosticReport = {
      id,
      error: diagnosis,
      stackAnalysis,
      context: fullContext,
      recommendations: this.generateRecommendations(diagnosis, stackAnalysis)
    }

    this.reports.set(id, report)
    return report
  }

  addRootCauseAnalysis(
    reportId: string,
    answers: string[],
    evidence?: string[]
  ): DiagnosticReport | null {
    const report = this.reports.get(reportId)
    if (!report) return null

    report.rootCause = analyze5Whys(
      report.error.message,
      answers,
      evidence
    )

    return report
  }

  private generateRecommendations(
    diagnosis: ErrorDiagnosis,
    stackAnalysis: StackAnalysis
  ): string[] {
    const recommendations: string[] = [...diagnosis.suggestions]

    if (stackAnalysis.originatingFrame) {
      const { file, line } = stackAnalysis.originatingFrame
      recommendations.push(`Review code at ${file}:${line}`)

      if (existsSync(file)) {
        try {
          const content = readFileSync(file, 'utf-8')
          const lines = content.split('\n')
          const contextLines = lines.slice(
            Math.max(0, line - 3),
            Math.min(lines.length, line + 2)
          )
          recommendations.push(`Relevant code context:\n${contextLines.join('\n')}`)
        } catch {
          // Ignore file read errors
        }
      }
    }

    if (diagnosis.severity === 'critical') {
      recommendations.unshift('CRITICAL: Immediate attention required')
      recommendations.push('Consider rolling back recent changes')
    }

    return recommendations
  }

  formatReport(report: DiagnosticReport): string {
    const lines: string[] = [
      '# Diagnostic Report',
      '',
      `**Report ID**: ${report.id}`,
      `**Timestamp**: ${report.context.timestamp}`,
      '',
      '## Error Summary',
      '',
      `| Field | Value |`,
      `|-------|-------|`,
      `| Type | ${report.error.type} |`,
      `| Message | ${report.error.message} |`,
      `| Severity | ${report.error.severity} |`,
    ]

    if (report.error.code) {
      lines.push(`| Code | ${report.error.code} |`)
    }
    if (report.error.status) {
      lines.push(`| Status | ${report.error.status} |`)
    }
    if (report.stackAnalysis.originatingFrame) {
      const { file, line, function: fn } = report.stackAnalysis.originatingFrame
      lines.push(`| Location | \`${file}:${line}\` |`)
      lines.push(`| Function | \`${fn}\` |`)
    }

    lines.push('')
    lines.push(formatStackAnalysis(report.stackAnalysis))

    if (report.context.requestId) {
      lines.push('')
      lines.push('## Request Context')
      lines.push('')
      lines.push(`- **Request ID**: ${report.context.requestId}`)
      if (report.context.endpoint) {
        lines.push(`- **Endpoint**: ${report.context.method || 'GET'} ${report.context.endpoint}`)
      }
      if (report.context.userId) {
        lines.push(`- **User ID**: ${report.context.userId}`)
      }
    }

    if (report.rootCause) {
      lines.push('')
      lines.push('## 5 Whys Analysis')
      lines.push('')
      for (const why of report.rootCause.whys) {
        lines.push(`**${why.level}. ${why.question}**`)
        lines.push(`> ${why.answer}`)
        if (why.evidence) {
          lines.push(`> *Evidence: ${why.evidence}*`)
        }
        lines.push('')
      }
      lines.push(`**Root Cause**: ${report.rootCause.rootCause}`)
    }

    lines.push('')
    lines.push('## Recommendations')
    lines.push('')
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`)
    }

    return lines.join('\n')
  }
}

export const diagnosticService = new DiagnosticService()
```

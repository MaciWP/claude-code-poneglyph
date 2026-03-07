# Stack Trace Analysis

Parsing and analysis utilities for JavaScript/TypeScript stack traces.

## Interfaces

```typescript
interface StackFrame {
  function: string
  file: string
  line: number
  column: number
  isInternal: boolean
  isNodeModules: boolean
}

interface StackAnalysis {
  frames: StackFrame[]
  originatingFrame: StackFrame | null
  involvedFiles: string[]
  errorPath: string[]
}
```

## analyzeStackTrace

Parses a raw stack trace string into structured `StackAnalysis`. Separates user frames from internal/node_modules frames and identifies the originating frame.

```typescript
function analyzeStackTrace(stack: string): StackAnalysis {
  const lines = stack.split('\n').slice(1) // Skip error message
  const frames: StackFrame[] = []

  for (const line of lines) {
    const match = line.match(/at (.+?) \((.+?):(\d+):(\d+)\)/)
    if (match) {
      frames.push({
        function: match[1],
        file: match[2],
        line: parseInt(match[3]),
        column: parseInt(match[4]),
        isInternal: match[2].startsWith('node:'),
        isNodeModules: match[2].includes('node_modules')
      })
    }
  }

  const userFrames = frames.filter(f => !f.isInternal && !f.isNodeModules)
  const involvedFiles = [...new Set(userFrames.map(f => f.file))]

  return {
    frames,
    originatingFrame: userFrames[0] || null,
    involvedFiles,
    errorPath: userFrames.map(f => `${f.function} (${f.file}:${f.line})`).reverse()
  }
}
```

## formatStackAnalysis

Formats a `StackAnalysis` into a readable Markdown string.

```typescript
function formatStackAnalysis(analysis: StackAnalysis): string {
  const lines: string[] = ['## Stack Trace Analysis', '']

  if (analysis.originatingFrame) {
    const { file, line, function: fn } = analysis.originatingFrame
    lines.push(`**Origin**: \`${fn}\` at \`${file}:${line}\``)
    lines.push('')
  }

  lines.push('### Call Path')
  for (const step of analysis.errorPath) {
    lines.push(`- ${step}`)
  }
  lines.push('')

  lines.push('### Involved Files')
  for (const file of analysis.involvedFiles) {
    lines.push(`- \`${file}\``)
  }

  return lines.join('\n')
}
```

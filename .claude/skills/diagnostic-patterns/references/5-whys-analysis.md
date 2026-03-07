# 5 Whys Analysis

Root cause analysis technique that drills down through layers of causation.

## Interfaces

```typescript
interface WhyAnalysis {
  level: number
  question: string
  answer: string
  evidence?: string
}

interface RootCauseAnalysis {
  problem: string
  whys: WhyAnalysis[]
  rootCause: string
  preventiveMeasures: string[]
}
```

## analyze5Whys

Takes a problem statement, a list of answers (each answering "why" for the previous), and optional evidence. Returns a structured `RootCauseAnalysis`.

```typescript
function analyze5Whys(
  problem: string,
  answers: string[],
  evidence?: string[]
): RootCauseAnalysis {
  const whys: WhyAnalysis[] = answers.map((answer, index) => ({
    level: index + 1,
    question: index === 0
      ? `Why did ${problem}?`
      : `Why ${answers[index - 1]}?`,
    answer,
    evidence: evidence?.[index]
  }))

  return {
    problem,
    whys,
    rootCause: answers[answers.length - 1],
    preventiveMeasures: generatePreventiveMeasures(answers[answers.length - 1])
  }
}
```

## generatePreventiveMeasures

Generates preventive measures based on root cause keywords.

```typescript
function generatePreventiveMeasures(rootCause: string): string[] {
  const measures: string[] = []

  if (rootCause.includes('test')) {
    measures.push('Add integration tests for edge cases')
    measures.push('Implement test coverage requirements')
  }
  if (rootCause.includes('validation')) {
    measures.push('Add input validation layer')
    measures.push('Use TypeScript strict mode')
  }
  if (rootCause.includes('null') || rootCause.includes('undefined')) {
    measures.push('Enable strict null checks in TypeScript')
    measures.push('Use optional chaining consistently')
  }
  if (rootCause.includes('timeout') || rootCause.includes('network')) {
    measures.push('Implement circuit breaker pattern')
    measures.push('Add retry logic with backoff')
  }

  return measures.length > 0 ? measures : ['Document and monitor for recurrence']
}
```

## Usage Example

```typescript
const analysis = analyze5Whys(
  'API returned 500 error',
  [
    'Database query failed',
    'Connection pool was exhausted',
    'Too many concurrent requests during peak',
    'No connection pooling limit was configured',
    'Production config was not reviewed for scale'
  ],
  [
    'Error log: "SequelizeConnectionError"',
    'Pool stats: 100/100 connections used',
    'Metrics: 500 req/s vs normal 50 req/s',
    'Config file: pool.max = 100 (default)',
    'No load testing performed before launch'
  ]
)
```

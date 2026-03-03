export interface QAStepResult {
  index: number
  action: string
  target: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  screenshotPath?: string
  error?: string
  durationMs?: number
}

export interface QAResult {
  id: string
  storyName: string
  status: 'running' | 'passed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt?: string
  steps: QAStepResult[]
  screenshots: string[]
  summary?: string
  error?: string
}

export interface QAStory {
  name: string
  description?: string
  steps: QAStoryStep[]
}

export interface QAStoryStep {
  action: 'navigate' | 'click' | 'fill' | 'wait' | 'screenshot' | 'assert' | 'hover' | 'select'
  target: string
  value?: string
  waitMs?: number
  description?: string
}

export type QAEvent =
  | { type: 'qa_started'; runId: string; storyName: string }
  | { type: 'qa_step'; runId: string; step: QAStepResult }
  | { type: 'qa_screenshot'; runId: string; path: string; stepIndex: number }
  | { type: 'qa_completed'; runId: string; result: QAResult }
  | { type: 'qa_error'; runId: string; error: string }

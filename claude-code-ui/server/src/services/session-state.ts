import { logger } from '../logger'

// --- Interfaces ---

export interface AgentExecutionRecord {
  agentType: string
  summary: string
  filesModified: string[]
  filesRead: string[]
  success: boolean
  errors: string[]
  durationMs: number
}

export interface TurnRecord {
  turnNumber: number
  userPrompt: string
  agentsExecuted: AgentExecutionRecord[]
  filesChangedThisTurn: string[]
  synthesisResult: string
  timestamp: number
}

export interface SessionState {
  sessionId: string
  workDir: string
  turns: TurnRecord[]
  cumulativeFilesModified: string[]
  lastGitDiffStat: string
  lastGitStatus: string
  currentObjective: string
}

// --- Manager ---

export class SessionStateManager {
  private states = new Map<string, SessionState>()

  getOrCreate(sessionId: string, workDir: string): SessionState {
    let state = this.states.get(sessionId)
    if (!state) {
      state = {
        sessionId,
        workDir,
        turns: [],
        cumulativeFilesModified: [],
        lastGitDiffStat: '',
        lastGitStatus: '',
        currentObjective: '',
      }
      this.states.set(sessionId, state)
      logger.info('session-state', `Created new session state for ${sessionId}`)
    }
    return state
  }

  recordTurn(
    sessionId: string,
    userPrompt: string,
    agentsExecuted: AgentExecutionRecord[],
    synthesisResult: string
  ): void {
    const state = this.states.get(sessionId)
    if (!state) {
      logger.warn('session-state', `Cannot record turn: session ${sessionId} not found`)
      return
    }

    const filesChangedThisTurn = [...new Set(agentsExecuted.flatMap((a) => a.filesModified))]

    const turn: TurnRecord = {
      turnNumber: state.turns.length + 1,
      userPrompt,
      agentsExecuted,
      filesChangedThisTurn,
      synthesisResult,
      timestamp: Date.now(),
    }

    state.turns.push(turn)

    // Update cumulative files
    for (const file of filesChangedThisTurn) {
      if (!state.cumulativeFilesModified.includes(file)) {
        state.cumulativeFilesModified.push(file)
      }
    }

    // Infer objective from first non-trivial prompt
    if (!state.currentObjective && userPrompt.length > 20) {
      state.currentObjective = userPrompt.slice(0, 200)
    }

    logger.info('session-state', `Recorded turn ${turn.turnNumber} for session ${sessionId}`, {
      agents: agentsExecuted.length,
      filesChanged: filesChangedThisTurn.length,
    })
  }

  updateFilesystemState(sessionId: string, gitDiffStat: string, gitStatus: string): void {
    const state = this.states.get(sessionId)
    if (!state) return
    state.lastGitDiffStat = gitDiffStat
    state.lastGitStatus = gitStatus
  }

  getContextForOrchestrator(sessionId: string): string {
    const state = this.states.get(sessionId)
    if (!state || state.turns.length === 0) return ''

    const lines: string[] = []
    lines.push(`## Session State (Turn ${state.turns.length + 1})`)

    if (state.currentObjective) {
      lines.push(`### Current Objective`)
      lines.push(state.currentObjective)
    }

    lines.push(`### Previous Turns`)
    // Show last 10 turns max
    const recentTurns = state.turns.slice(-10)
    for (const turn of recentTurns) {
      const agentSummaries = turn.agentsExecuted
        .map((a) => {
          const status = a.success ? 'OK' : 'FAILED'
          const files =
            a.filesModified.length > 0 ? `, modified: ${a.filesModified.join(', ')}` : ''
          return `${a.agentType}: ${a.summary.slice(0, 200)} (${status}${files})`
        })
        .join('; ')

      lines.push(
        `- Turn ${turn.turnNumber}: "${turn.userPrompt.slice(0, 100)}" → ${agentSummaries}`
      )
    }

    if (state.cumulativeFilesModified.length > 0) {
      lines.push(`### Files Modified This Session`)
      for (const file of state.cumulativeFilesModified) {
        const turnNum = state.turns.find((t) => t.filesChangedThisTurn.includes(file))?.turnNumber
        lines.push(`- ${file} (Turn ${turnNum ?? '?'})`)
      }
    }

    if (state.lastGitDiffStat) {
      lines.push(`### Filesystem State`)
      lines.push('```')
      lines.push(state.lastGitDiffStat)
      lines.push('```')
    }

    if (state.lastGitStatus) {
      lines.push(`### Git Status`)
      lines.push('```')
      lines.push(state.lastGitStatus)
      lines.push('```')
    }

    return lines.join('\n')
  }

  getState(sessionId: string): SessionState | undefined {
    return this.states.get(sessionId)
  }

  clearSession(sessionId: string): void {
    this.states.delete(sessionId)
  }
}

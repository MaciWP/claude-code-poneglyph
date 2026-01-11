import { useMemo } from 'react'
import type { LogEntry, FilterType } from '../types/chat'

interface UseLogFilterOptions {
  logs: LogEntry[]
  filter: FilterType
}

interface FilterStats {
  total: number
  response: number
  tool: number
  file: number
  exec: number
  agent: number
  mcp: number
  plan: number
  context: number
  thinking: number
}

interface UseLogFilterReturn {
  filteredLogs: LogEntry[]
  stats: FilterStats
}

export function useLogFilter({ logs, filter }: UseLogFilterOptions): UseLogFilterReturn {
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filter === 'all') return true
      // CHAT filter: include responses, results, AND context entries (skills, rules, MCPs)
      if (filter === 'response') {
        return log.type === 'response' ||
               log.type === 'result' ||
               (log.type === 'init' && log.content.startsWith('context:'))
      }
      if (filter === 'tool') {
        if (log.type !== 'tool') return false
        const toolName = log.tool || ''
        return !toolName.toLowerCase().includes('task')
      }
      if (filter === 'file') {
        if (log.type !== 'tool') return false
        const toolName = log.tool || ''
        return ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'NotebookEdit'].includes(toolName)
      }
      if (filter === 'exec') {
        if (log.type !== 'tool') return false
        const toolName = log.tool || ''
        return ['Bash', 'KillShell'].includes(toolName)
      }
      if (filter === 'agent') {
        if (log.type === 'agent_result') return true
        if (log.type !== 'tool') return false
        const toolName = log.tool || ''
        return toolName.toLowerCase().includes('task')
      }
      if (filter === 'mcp') {
        if (log.type !== 'tool') return false
        return (log.tool || '').startsWith('mcp__')
      }
      if (filter === 'plan') {
        if (log.type !== 'tool') return false
        const toolName = log.tool || ''
        return ['TodoWrite', 'EnterPlanMode', 'ExitPlanMode'].includes(toolName)
      }
      if (filter === 'context') {
        return log.type === 'init' && log.content.startsWith('context:')
      }
      if (filter === 'thinking') return log.type === 'thinking'
      return true
    })
  }, [logs, filter])

  const stats = useMemo((): FilterStats => {
    let response = 0
    let tool = 0
    let file = 0
    let exec = 0
    let agent = 0
    let mcp = 0
    let plan = 0
    let context = 0
    let thinking = 0

    for (const log of logs) {
      if (log.type === 'response' || log.type === 'result') response++
      if (log.type === 'thinking') thinking++
      if (log.type === 'init' && log.content.startsWith('context:')) context++

      if (log.type === 'tool') {
        const toolName = log.tool || ''
        if (!toolName.toLowerCase().includes('task')) tool++
        if (['Read', 'Write', 'Edit', 'Glob', 'Grep', 'NotebookEdit'].includes(toolName)) file++
        if (['Bash', 'KillShell'].includes(toolName)) exec++
        if (toolName.toLowerCase().includes('task')) agent++
        if (toolName.startsWith('mcp__')) mcp++
        if (['TodoWrite', 'EnterPlanMode', 'ExitPlanMode'].includes(toolName)) plan++
      }

      if (log.type === 'agent_result') agent++
    }

    return {
      total: logs.length,
      response,
      tool,
      file,
      exec,
      agent,
      mcp,
      plan,
      context,
      thinking,
    }
  }, [logs])

  return { filteredLogs, stats }
}

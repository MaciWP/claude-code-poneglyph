import type { ToolUse } from './types'

export function extractShortInput(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined
  const obj = input as Record<string, unknown>
  if (obj.file_path) return String(obj.file_path).split('/').slice(-2).join('/')
  if (obj.pattern) return String(obj.pattern)
  if (obj.command) return String(obj.command).slice(0, 40)
  if (obj.query) return String(obj.query).slice(0, 40)
  if (obj.prompt) return String(obj.prompt).slice(0, 40)
  return undefined
}

export function classifyTool(toolName: string, toolInput?: unknown): ToolUse['type'] {
  if (toolName === 'Task') return 'agent'
  if (toolName === 'TaskOutput') return 'tool'
  if (toolName.startsWith('mcp__')) return 'mcp'

  // Skill tool can execute both skills and commands
  // Commands start with '/' (e.g., /advanced-planner, /docs)
  if (toolName === 'Skill' && toolInput && typeof toolInput === 'object') {
    const input = toolInput as { skill?: string }
    if (input.skill?.startsWith('/')) {
      return 'command'
    }
    return 'skill'
  }

  if (toolName.toLowerCase().includes('skill')) return 'skill'
  return 'tool'
}

export function normalizeContent(content: unknown): string {
  if (content === null || content === undefined) return ''
  if (typeof content === 'string') return content
  try {
    return JSON.stringify(content)
  } catch {
    return String(content)
  }
}

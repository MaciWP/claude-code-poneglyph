import { useState, memo } from 'react'
import { getToolTaxonomy } from '../../types/chat'
import { Icons } from '../../lib/icons'
import { formatTime, cn } from '../../lib/utils'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { Badge } from '../ui/Badge'

const BORDER_COLORS: Record<string, string> = {
  'text-emerald-400': 'border-emerald-500/50',
  'text-amber-400': 'border-amber-500/50',
  'text-blue-400': 'border-blue-500/50',
  'text-orange-400': 'border-orange-500/50',
  'text-purple-400': 'border-purple-500/50',
  'text-cyan-400': 'border-cyan-500/50',
  'text-yellow-400': 'border-yellow-500/50',
  'text-teal-400': 'border-teal-500/50',
  'text-pink-400': 'border-pink-500/50',
  'text-red-400': 'border-red-500/50',
  'text-gray-400': 'border-gray-500/50',
  'text-indigo-400': 'border-indigo-500/50',
  'text-rose-400': 'border-rose-500/50',
  'text-lime-400': 'border-lime-500/50',
}

interface Props {
  toolName: string
  toolInput?: unknown
  toolOutput?: string
  timestamp: Date
  agentName?: string
}

function extractFilePath(_toolName: string, toolInput: unknown): string | null {
  if (!toolInput || typeof toolInput !== 'object') return null
  const input = toolInput as Record<string, unknown>

  if (input.file_path && typeof input.file_path === 'string') {
    return input.file_path
  }
  if (input.path && typeof input.path === 'string') {
    return input.path
  }
  if (input.pattern && typeof input.pattern === 'string') {
    return input.pattern
  }
  return null
}

function extractCommand(toolInput: unknown): string | null {
  if (!toolInput || typeof toolInput !== 'object') return null
  const input = toolInput as Record<string, unknown>

  if (input.command && typeof input.command === 'string') {
    return input.command.length > 60 ? input.command.slice(0, 60) + '...' : input.command
  }
  return null
}

function extractAgentType(toolInput: unknown): string | null {
  if (!toolInput || typeof toolInput !== 'object') return null
  const input = toolInput as Record<string, unknown>

  if (input.subagent_type && typeof input.subagent_type === 'string') {
    return input.subagent_type
  }
  return null
}

function extractSkillOrCommand(toolInput: unknown): { type: 'skill' | 'command'; name: string } | null {
  if (!toolInput || typeof toolInput !== 'object') return null
  const input = toolInput as Record<string, unknown>

  if (input.skill && typeof input.skill === 'string') {
    // Commands start with '/' (e.g., /advanced-planner, /docs)
    if (input.skill.startsWith('/')) {
      return { type: 'command', name: input.skill }
    }
    return { type: 'skill', name: input.skill }
  }
  return null
}

function formatMCPToolName(toolName: string): { server: string; tool: string } {
  const parts = toolName.split('__')
  if (parts.length >= 3) {
    return { server: parts[1], tool: parts.slice(2).join('__') }
  }
  return { server: 'unknown', tool: toolName }
}

export default memo(function ToolCard({ toolName, toolInput, toolOutput, timestamp, agentName }: Props) {
  const { copied, copy } = useCopyToClipboard()
  const [expanded, setExpanded] = useState(false)

  const baseTaxonomy = getToolTaxonomy(toolName)
  const filePath = extractFilePath(toolName, toolInput)
  const command = extractCommand(toolInput)
  const agentType = extractAgentType(toolInput)
  const skillOrCommand = toolName === 'Skill' ? extractSkillOrCommand(toolInput) : null
  const isMCP = toolName.startsWith('mcp__')
  const mcpInfo = isMCP ? formatMCPToolName(toolName) : null

  // Override taxonomy for commands (executed via Skill tool)
  const taxonomy = skillOrCommand?.type === 'command'
    ? { ...baseTaxonomy, icon: 'terminal' as const, color: 'text-blue-400', bgColor: 'bg-blue-500/20', category: 'command' }
    : baseTaxonomy

  const displayName = isMCP
    ? `MCP: ${mcpInfo?.server}`
    : agentType
      ? `Agent: ${agentType}`
      : skillOrCommand
        ? `${skillOrCommand.type === 'command' ? 'Command' : 'Skill'}: ${skillOrCommand.name}`
        : toolName

  const IconComponent = Icons[taxonomy.icon]

  function handleCopy() {
    const content = toolOutput || JSON.stringify(toolInput, null, 2)
    copy(content)
  }

  const borderColor = BORDER_COLORS[taxonomy.color] || 'border-gray-500/50'

  if (!expanded) {
    const quickInfo = filePath || command || mcpInfo?.tool
    return (
      <div
        className={cn(
          'rounded border px-2 py-1 flex items-center gap-2 cursor-pointer',
          'transition-all duration-200 ease-out hover:bg-white/5 hover:border-stroke-secondary hover:scale-[1.01]',
          taxonomy.bgColor,
          borderColor
        )}
        onClick={() => setExpanded(true)}
      >
        <IconComponent className="w-4 h-4" />
        <span className={cn('text-xs font-medium', taxonomy.color)}>{displayName}</span>
        {quickInfo && (
          <span className="text-[11px] text-content-subtle font-mono truncate max-w-[200px]">
            {quickInfo}
          </span>
        )}
        {agentName && (
          <span className="text-[11px] text-orange-400">via {agentName}</span>
        )}
        <span className="ml-auto text-[11px] text-content-dimmed">
          {formatTime(timestamp)}
        </span>
        <Icons.chevronRight className="w-3 h-3 text-content-dimmed transition-transform duration-150" />
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden transition-all duration-200 ease-out animate-slide-up',
      taxonomy.bgColor,
      borderColor
    )}>
      <div
        className="px-3 py-2 flex items-center gap-2 border-b border-white/5 cursor-pointer transition-colors duration-150 hover:bg-white/5"
        onClick={() => setExpanded(false)}
      >
        <IconComponent className="w-5 h-5" />
        <span className={cn('font-medium', taxonomy.color)}>{displayName}</span>
        {mcpInfo && (
          <span className="text-xs text-content-subtle font-mono">{mcpInfo.tool}</span>
        )}
        <Badge size="xs" className={cn('ml-auto', taxonomy.bgColor, taxonomy.color)}>
          {taxonomy.category}
        </Badge>
        <span className="text-[11px] text-content-dimmed">
          {formatTime(timestamp)}
        </span>
        <Icons.chevronDown className="w-3 h-3 text-content-subtle" />
      </div>

      {(filePath || command || agentName) && (
        <div className="px-3 py-1.5 bg-black/20 border-b border-white/5 space-y-1">
          {filePath && (
            <div className="flex items-center gap-1.5 text-xs">
              <Icons.folder className="w-3 h-3 text-content-subtle" />
              <span className="text-content-secondary font-mono truncate">{filePath}</span>
            </div>
          )}
          {command && (
            <div className="flex items-center gap-1.5 text-xs">
              <Icons.terminal className="w-3 h-3 text-content-subtle" />
              <span className="text-content-secondary font-mono truncate">{command}</span>
            </div>
          )}
          {agentName && (
            <div className="flex items-center gap-1.5 text-xs">
              <Icons.bot className="w-3 h-3 text-orange-400" />
              <span className="text-orange-300">{agentName}</span>
            </div>
          )}
        </div>
      )}

      <div className="px-3 py-2 flex items-center gap-2">
        {(toolInput || toolOutput) && (
          <button
            onClick={handleCopy}
            className="text-xs text-content-subtle hover:text-content-secondary flex items-center gap-1 transition-colors duration-150"
          >
            {copied ? (
              <>
                <Icons.check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Icons.copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        )}
      </div>

      <div className="border-t border-white/5 max-h-64 overflow-y-auto">
        {toolInput !== undefined && (
          <div className="p-2">
            <div className="text-[11px] text-content-subtle uppercase mb-1">Input</div>
            <pre className="text-xs text-content-secondary bg-black/30 rounded p-2 overflow-x-auto max-h-24 overflow-y-auto font-mono text-[11px] leading-tight">
              {typeof toolInput === 'string' ? toolInput : JSON.stringify(toolInput, null, 2)}
            </pre>
          </div>
        )}

        {toolOutput && (
          <div className="p-2 border-t border-white/5">
            <div className="text-[11px] text-content-subtle uppercase mb-1">Output</div>
            <pre className="text-xs text-content-secondary bg-black/30 rounded p-2 overflow-x-auto max-h-24 overflow-y-auto font-mono whitespace-pre-wrap text-[11px] leading-tight">
              {toolOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
})


import { useState, memo } from 'react'
import type { AgentStep } from '../../types/chat'
import MarkdownContent from './MarkdownContent'
import { getAgentIcon } from '../../lib/constants'
import { getModelBadge } from '../../lib/utils'
import { Icons } from '../../lib/icons'

interface Props {
  agentType: string
  prompt: string
  result?: string
  error?: string
  timestamp: Date
  model?: string
  agentId?: string
  title?: string
  agentTools?: string[]
  agentSteps?: AgentStep[]
  agentStartTime?: Date
  agentStatus?: 'running' | 'completed' | 'failed'
}

export default memo(function AgentResultCard({ agentType, prompt, result, error, timestamp, model, agentId, title, agentTools, agentSteps, agentStartTime, agentStatus }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const iconName = getAgentIcon(agentType)
  const IconComponent = Icons[iconName]

  // Use explicit agentStatus if available, otherwise infer from result/error
  const status = agentStatus || (error ? 'failed' : result ? 'completed' : 'running')
  const hasError = status === 'failed'
  const hasResult = status === 'completed'
  const isInProgress = status === 'running'
  const modelBadge = getModelBadge(model)

  const executionTime = agentStartTime
    ? Math.round((timestamp.getTime() - agentStartTime.getTime()) / 1000)
    : null

  const borderColor = hasError
    ? 'border-red-500/50'
    : hasResult
      ? 'border-green-500/50'
      : 'border-orange-500/50'

  const bgColor = hasError
    ? 'bg-red-500/10'
    : hasResult
      ? 'bg-green-500/10'
      : 'bg-orange-500/10'

  const statusColor = hasError
    ? 'text-red-400'
    : hasResult
      ? 'text-green-400'
      : 'text-orange-400'

  async function copyContent() {
    const content = error || result || prompt
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Compact mode: single line when not expanded
  if (!expanded && !isInProgress) {
    const resultSummary = hasResult && result
      ? result.split('\n')[0].slice(0, 80) + (result.length > 80 ? '...' : '')
      : hasError
        ? 'Error occurred'
        : ''

    return (
      <div
        className={`rounded border ${borderColor} ${bgColor} px-2 py-1 flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors`}
        onClick={() => setExpanded(true)}
      >
        <IconComponent className="w-4 h-4" />
        {modelBadge && (
          <span className={`${modelBadge.color} text-white text-[11px] px-1 rounded font-bold`} title={model}>
            {modelBadge.text}
          </span>
        )}
        <span className="text-xs font-medium text-orange-300">{agentType}</span>
        {title && (
          <span className="text-[11px] text-gray-400 truncate max-w-[300px]">
            | {title}
          </span>
        )}
        <span className="text-[11px] text-gray-500 truncate max-w-[200px]">{resultSummary}</span>
        <span className={`ml-auto ${statusColor}`}>
          {hasError ? (
            <Icons.x className="w-4 h-4" />
          ) : hasResult ? (
            <Icons.check className="w-4 h-4" />
          ) : (
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse inline-block" />
          )}
        </span>
        <span className="text-[11px] text-gray-600">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <Icons.chevronRight className="w-3 h-3 text-gray-600" />
      </div>
    )
  }

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2 border-b border-white/10 cursor-pointer hover:bg-white/5"
        onClick={() => setExpanded(false)}
      >
        <IconComponent className="w-5 h-5" />
        {modelBadge && (
          <span className={`${modelBadge.color} text-white text-[11px] px-1.5 py-0.5 rounded font-bold`} title={model}>
            {modelBadge.text}
          </span>
        )}
        <span className="font-medium text-orange-300">Agent: {agentType}</span>
        {agentId && <span className="text-[11px] text-gray-600 font-mono">ID: {agentId.slice(0, 8)}</span>}
        <div className={`ml-auto flex items-center gap-1.5 ${statusColor}`}>
          {isInProgress ? (
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          ) : hasError ? (
            <Icons.x className="w-4 h-4" />
          ) : (
            <Icons.check className="w-4 h-4" />
          )}
        </div>
        <span className="text-[11px] text-gray-600">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        {!isInProgress && <Icons.chevronDown className="w-3 h-3 text-gray-500" />}
      </div>


      {/* Prompt Section - always show for context */}
      <div className="px-3 py-2 border-b border-white/5 bg-black/20">
        <div className="text-[11px] text-gray-500 uppercase mb-1">Prompt</div>
        <div className="text-xs text-gray-300 max-h-40 overflow-y-auto">
          <MarkdownContent content={prompt} />
        </div>
      </div>

      {/* Mini-Timeline - Steps in real-time */}
      {agentSteps && agentSteps.length > 0 && (
        <div className="px-3 py-2 border-b border-white/5 bg-black/10 max-h-36 overflow-y-auto">
          <div className="text-[11px] text-gray-500 uppercase mb-1.5">
            Steps ({agentSteps.filter(s => s.status === 'completed').length}/{agentSteps.length})
          </div>
          <div className="space-y-0.5">
            {agentSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                {step.status === 'completed' ? (
                  <Icons.check className="w-3 h-3 text-green-400" />
                ) : (
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                )}
                <span className="text-gray-400 font-mono min-w-[60px]">{step.tool}</span>
                {step.input && (
                  <span className="text-gray-600 truncate max-w-[180px]" title={step.input}>
                    {step.input}
                  </span>
                )}
                <span className="ml-auto text-gray-700 text-[11px] tabular-nums">
                  {step.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Section */}
      {hasError && (
        <div className="px-3 py-2 bg-red-500/10">
          <div className="text-[11px] text-red-400 uppercase mb-1 flex items-center justify-between">
            <span>Error</span>
            <button
              onClick={copyContent}
              className="text-red-400/60 hover:text-red-300 text-[11px] flex items-center gap-1"
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
          </div>
          <pre className="text-xs text-red-300 bg-red-500/20 rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono">
            {error}
          </pre>
        </div>
      )}

      {/* Result Section */}
      {hasResult && (
        <div className="px-3 py-2">
          <div className="text-[11px] text-green-400 uppercase mb-1 flex items-center justify-between">
            <span>Result</span>
            <button
              onClick={copyContent}
              className="text-gray-500 hover:text-gray-300 text-[11px] flex items-center gap-1"
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
          </div>
          <div className="text-sm text-gray-200 bg-black/20 rounded p-2 max-h-96 overflow-y-auto">
            <MarkdownContent content={result || ''} />
          </div>
        </div>
      )}

      {/* Tools used by agent */}
      {agentTools && agentTools.length > 0 && (
        <div className="px-3 py-1.5 border-t border-white/5 bg-black/10">
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[11px] text-gray-500 mr-1">Tools:</span>
            {Object.entries(
              agentTools.reduce((acc, tool) => {
                acc[tool] = (acc[tool] || 0) + 1
                return acc
              }, {} as Record<string, number>)
            ).map(([tool, count]) => (
              <span
                key={tool}
                className="text-[11px] bg-gray-700/50 text-gray-400 px-1.5 py-0.5 rounded"
              >
                {tool}{count > 1 ? ` ×${count}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* In Progress Indicator */}
      {isInProgress && (
        <div className="px-3 py-2 flex items-center gap-2 text-orange-400">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs">Agent is working...</span>
          {agentSteps && agentSteps.length > 0 && (
            <span className="text-[11px] text-gray-500 ml-auto">
              {agentSteps.filter(s => s.status === 'completed').length} steps completed
            </span>
          )}
        </div>
      )}

      {/* Execution Time (when completed) */}
      {!isInProgress && executionTime !== null && (
        <div className="px-3 py-1 border-t border-white/5 bg-black/20 flex items-center justify-end">
          <span className="text-[11px] text-gray-600 flex items-center gap-1">
            <Icons.clock className="w-3 h-3" />
            {executionTime}s
          </span>
        </div>
      )}
    </div>
  )
})

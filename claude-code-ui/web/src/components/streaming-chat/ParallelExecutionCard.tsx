import { memo } from 'react'
import type { AgentStep } from '../../types/chat'
import { Icons } from '../../lib/icons'

interface ParallelExecutionCardProps {
  steps: AgentStep[]
  activeAgentCount: number
  isActive: boolean
}

export default memo(function ParallelExecutionCard({
  steps,
  activeAgentCount,
  isActive,
}: ParallelExecutionCardProps) {
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const runningSteps = steps.filter(s => s.status === 'running').length

  const borderColor = isActive ? 'border-violet-500/50' : 'border-violet-500/30'
  const bgColor = isActive ? 'bg-violet-500/10' : 'bg-violet-500/5'

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/10">
        <Icons.layers className="w-5 h-5 text-violet-400" />
        <span className="font-medium text-violet-300">Parallel Execution</span>
        <span className="text-[11px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
          {activeAgentCount} agents
        </span>
        <div className="ml-auto flex items-center gap-2">
          {isActive ? (
            <>
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
              <span className="text-[11px] text-violet-400">Running</span>
            </>
          ) : (
            <>
              <Icons.check className="w-4 h-4 text-green-400" />
              <span className="text-[11px] text-green-400">Completed</span>
            </>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-3 py-1.5 bg-violet-500/5 border-b border-white/5 text-[11px] text-gray-500">
        <Icons.info className="w-3 h-3 inline mr-1" />
        Tools from parallel agents shown here (individual attribution not possible)
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="px-3 py-2 max-h-48 overflow-y-auto">
          <div className="text-[11px] text-gray-500 uppercase mb-1.5 flex items-center justify-between">
            <span>Tools ({completedSteps}/{steps.length})</span>
            {runningSteps > 0 && (
              <span className="text-violet-400">{runningSteps} running</span>
            )}
          </div>
          <div className="space-y-0.5">
            {steps.map((step, i) => (
              <div key={step.toolUseId || i} className="flex items-center gap-2 text-[11px]">
                {step.status === 'completed' ? (
                  <Icons.check className="w-3 h-3 text-green-400 flex-shrink-0" />
                ) : step.status === 'failed' ? (
                  <Icons.x className="w-3 h-3 text-red-400 flex-shrink-0" />
                ) : (
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse flex-shrink-0" />
                )}
                <span className="text-gray-400 font-mono min-w-[60px]">{step.tool}</span>
                {step.input && (
                  <span className="text-gray-600 truncate max-w-[200px]" title={step.input}>
                    {step.input}
                  </span>
                )}
                <span className="ml-auto text-gray-700 text-[10px] tabular-nums">
                  {step.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {steps.length === 0 && isActive && (
        <div className="px-3 py-3 flex items-center gap-2 text-violet-400">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs">Waiting for parallel tools...</span>
        </div>
      )}
    </div>
  )
})

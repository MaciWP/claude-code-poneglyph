import { memo } from 'react'
import type { TodoItem } from '../../types/chat'
import { Icons } from '../../lib/icons'

interface AgentTodoBarProps {
  todos: TodoItem[]
  agentName?: string
  compact?: boolean
}

export default memo(function AgentTodoBar({ todos, compact = true }: AgentTodoBarProps) {
  const completed = todos.filter(t => t.status === 'completed').length
  const inProgress = todos.find(t => t.status === 'in_progress')
  const progress = todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0

  if (compact) {
    // Empty state for compact mode
    if (!todos.length) {
      return (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="w-16 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
            <div className="h-full bg-gray-600/30" style={{ width: '0%' }} />
          </div>
          <span className="text-[11px] tabular-nums">0/0</span>
          <span className="text-[11px] text-gray-600 italic">waiting...</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        {/* Progress bar */}
        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] tabular-nums">{completed}/{todos.length}</span>
        {inProgress && (
          <span className="text-[11px] text-cyan-400 truncate max-w-[120px]">
            • {inProgress.activeForm}
          </span>
        )}
      </div>
    )
  }

  // Empty state for expanded mode
  if (!todos.length) {
    return (
      <div className="px-3 py-2 bg-black/20 border-t border-white/5">
        <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
          <span className="uppercase">Agent Tasks</span>
          <span>0/0</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-600 italic">
          <span className="w-2 h-2 bg-gray-700 rounded-full flex-shrink-0 animate-pulse" />
          <span>Waiting for tasks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1 px-3 py-2 bg-black/20 border-t border-white/5">
      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
        <span className="uppercase">Agent Tasks</span>
        <span>{completed}/{todos.length}</span>
      </div>
      {todos.map((todo, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          {todo.status === 'completed' ? (
            <Icons.check className="w-3 h-3 text-green-400 flex-shrink-0" />
          ) : todo.status === 'in_progress' ? (
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse flex-shrink-0" />
          ) : (
            <span className="w-2 h-2 bg-gray-600 rounded-full flex-shrink-0" />
          )}
          <span className={`truncate ${
            todo.status === 'completed' ? 'text-gray-500 line-through' :
            todo.status === 'in_progress' ? 'text-cyan-300' : 'text-gray-400'
          }`}>
            {todo.status === 'in_progress' ? todo.activeForm : todo.content}
          </span>
        </div>
      ))}
    </div>
  )
})

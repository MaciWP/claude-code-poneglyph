import { memo } from 'react'
import { Icons } from '../lib/icons'
import { StatusDot } from './ui/StatusBadge'
import type { TodoItem } from '../types/chat'

interface Props {
  todos: TodoItem[]
}

export default memo(function TodoBar({ todos }: Props) {
  if (todos.length === 0) return null

  const completed = todos.filter(t => t.status === 'completed').length
  const inProgress = todos.find(t => t.status === 'in_progress')
  const pending = todos.filter(t => t.status === 'pending').length

  return (
    <div className="sticky bottom-0 z-10 bg-surface-secondary border-t border-stroke-primary px-4 py-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs">
          <Icons.clipboard className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-content-muted">
            {completed}/{todos.length}
          </span>
        </div>

        {inProgress && (
          <div className="flex items-center gap-1.5 text-xs text-status-info">
            <StatusDot status="running" size="sm" />
            <span className="truncate max-w-[200px]">{inProgress.activeForm}</span>
          </div>
        )}

        <div className="flex-1 flex gap-0.5 max-w-[300px]">
          {todos.map((todo, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                todo.status === 'completed'
                  ? 'bg-status-success'
                  : todo.status === 'in_progress'
                    ? 'bg-status-info animate-pulse'
                    : 'bg-gray-600'
              }`}
              title={`${todo.content} (${todo.status})`}
            />
          ))}
        </div>

        {pending > 0 && (
          <span className="text-[11px] text-content-subtle">
            {pending} pending
          </span>
        )}
      </div>
    </div>
  )
})

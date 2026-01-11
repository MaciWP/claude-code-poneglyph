import { cn } from '../../lib/utils'
import { status, type StatusType } from '../../lib/theme'

type StatusProp = StatusType | 'completed' | 'failed' | 'active' | 'connected' | 'disconnected' | 'processing'

interface StatusBadgeProps {
  status: StatusProp
  label?: string
  showIndicator?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const statusMap: Record<StatusProp, StatusType> = {
  completed: 'success',
  failed: 'error',
  active: 'running',
  running: 'running',
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
  pending: 'pending',
  connected: 'success',
  disconnected: 'error',
  processing: 'warning',
}

export function StatusBadge({
  status: statusProp,
  label,
  showIndicator = true,
  size = 'sm',
  className,
}: StatusBadgeProps) {
  const normalizedStatus = statusMap[statusProp] || 'pending'
  const styles = status[normalizedStatus]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded font-medium',
        styles.bg,
        styles.text,
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        className
      )}
    >
      {showIndicator && (
        <span
          className={cn(
            'rounded-full',
            styles.dot,
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
            normalizedStatus === 'running' && 'animate-pulse'
          )}
        />
      )}
      {label ?? statusProp}
    </span>
  )
}

interface StatusDotProps {
  status: StatusProp
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

export function StatusDot({ status: statusProp, size = 'md', pulse, className }: StatusDotProps) {
  const normalizedStatus = statusMap[statusProp] || 'pending'
  const styles = status[normalizedStatus]

  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }

  return (
    <span
      className={cn(
        'rounded-full',
        styles.dot,
        sizeClasses[size],
        (pulse ?? normalizedStatus === 'running') && 'animate-pulse',
        className
      )}
    />
  )
}

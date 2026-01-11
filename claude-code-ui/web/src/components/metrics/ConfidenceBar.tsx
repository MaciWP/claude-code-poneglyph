import { cn } from '../../lib/utils'

interface ConfidenceBarProps {
  value: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
}

export default function ConfidenceBar({
  value,
  size = 'md',
  showLabel = false,
  animated = true,
}: ConfidenceBarProps) {
  const percentage = Math.round(value * 100)

  const sizeClasses = {
    sm: { bar: 'w-16 h-1.5', text: 'text-[10px]' },
    md: { bar: 'w-24 h-2', text: 'text-xs' },
    lg: { bar: 'w-32 h-2.5', text: 'text-sm' },
  }

  const getColor = (): string => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    if (percentage >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className={cn('text-content-muted tabular-nums', sizeClasses[size].text)}>
          {percentage}%
        </span>
      )}
      <div className={cn(
        'bg-surface-primary rounded-full overflow-hidden',
        sizeClasses[size].bar
      )}>
        <div
          className={cn(
            'h-full rounded-full',
            getColor(),
            animated && 'transition-all duration-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

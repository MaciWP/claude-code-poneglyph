import { cn } from '../../lib/utils'

type ProgressColor = 'auto' | 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'orange' | 'purple' | 'cyan'

interface ProgressBarProps {
  value: number
  variant?: 'default' | 'segmented'
  color?: ProgressColor
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
  segments?: number
  className?: string
}

function getAutoColor(value: number): string {
  if (value > 80) return 'bg-red-500'
  if (value > 50) return 'bg-yellow-500'
  return 'bg-green-500'
}

function getAutoTextColor(value: number): string {
  if (value > 80) return 'text-red-400'
  if (value > 50) return 'text-yellow-400'
  return 'text-green-400'
}

const colorMap: Record<Exclude<ProgressColor, 'auto'>, string> = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
}

const textColorMap: Record<Exclude<ProgressColor, 'auto'>, string> = {
  green: 'text-green-400',
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  gray: 'text-gray-400',
  orange: 'text-orange-400',
  purple: 'text-purple-400',
  cyan: 'text-cyan-400',
}

const heightMap = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
}

export function ProgressBar({
  value,
  variant = 'default',
  color = 'auto',
  size = 'sm',
  showLabel = false,
  segments = 0,
  className,
}: ProgressBarProps) {
  const barColor = color === 'auto' ? getAutoColor(value) : colorMap[color]
  const textColor = color === 'auto' ? getAutoTextColor(value) : textColorMap[color]
  const heightClass = heightMap[size]

  if (variant === 'segmented' && segments > 0) {
    return (
      <div className={cn('flex gap-0.5', className)}>
        {Array.from({ length: segments }).map((_, i) => {
          const segmentValue = ((i + 1) / segments) * 100
          const isActive = value >= segmentValue
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-full transition-colors',
                heightClass,
                isActive ? barColor : 'bg-gray-700'
              )}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 bg-gray-700 rounded-full overflow-hidden', heightClass)}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-xs tabular-nums', textColor)}>
          {value.toFixed(1)}%
        </span>
      )}
    </div>
  )
}


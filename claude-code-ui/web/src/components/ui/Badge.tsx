import { cn } from '../../lib/utils'

type BadgeColor = 'purple' | 'blue' | 'green' | 'orange' | 'gray' | 'red' | 'amber' | 'cyan' | 'pink'

interface BadgeProps {
  variant?: 'default' | 'outline' | 'solid'
  color?: BadgeColor
  size?: 'xs' | 'sm' | 'md'
  children: React.ReactNode
  className?: string
}

const colorStyles: Record<BadgeColor, Record<'solid' | 'outline' | 'default', string>> = {
  purple: {
    solid: 'bg-purple-600 text-white',
    outline: 'border-purple-500 text-purple-400',
    default: 'bg-purple-600/20 text-purple-400',
  },
  blue: {
    solid: 'bg-blue-600 text-white',
    outline: 'border-blue-500 text-blue-400',
    default: 'bg-blue-600/20 text-blue-400',
  },
  green: {
    solid: 'bg-green-600 text-white',
    outline: 'border-green-500 text-green-400',
    default: 'bg-green-600/20 text-green-400',
  },
  orange: {
    solid: 'bg-orange-600 text-white',
    outline: 'border-orange-500 text-orange-400',
    default: 'bg-orange-600/20 text-orange-400',
  },
  gray: {
    solid: 'bg-gray-600 text-white',
    outline: 'border-gray-500 text-gray-400',
    default: 'bg-gray-600/20 text-gray-400',
  },
  red: {
    solid: 'bg-red-600 text-white',
    outline: 'border-red-500 text-red-400',
    default: 'bg-red-600/20 text-red-400',
  },
  amber: {
    solid: 'bg-amber-600 text-white',
    outline: 'border-amber-500 text-amber-400',
    default: 'bg-amber-600/20 text-amber-400',
  },
  cyan: {
    solid: 'bg-cyan-600 text-white',
    outline: 'border-cyan-500 text-cyan-400',
    default: 'bg-cyan-600/20 text-cyan-400',
  },
  pink: {
    solid: 'bg-pink-600 text-white',
    outline: 'border-pink-500 text-pink-400',
    default: 'bg-pink-600/20 text-pink-400',
  },
}

const sizeStyles = {
  xs: 'px-1 py-0.5 text-[10px]',
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
}

export function Badge({
  variant = 'default',
  color = 'gray',
  size = 'sm',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded transition-colors',
        variant === 'outline' && 'border',
        colorStyles[color][variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}

interface ToggleBadgeProps extends Omit<BadgeProps, 'variant'> {
  active: boolean
  onClick?: () => void
}

export function ToggleBadge({ active, onClick, color = 'gray', ...props }: ToggleBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface-primary focus:ring-blue-500 rounded"
    >
      <Badge
        {...props}
        color={color}
        variant={active ? 'solid' : 'default'}
        className={cn(
          'cursor-pointer transition-all duration-150',
          !active && 'opacity-60 hover:opacity-100',
          props.className
        )}
      />
    </button>
  )
}

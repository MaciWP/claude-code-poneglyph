import { Icons, type IconName } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Button } from './Button'

type EmptyStateVariant = 'default' | 'compact' | 'inline'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

interface EmptyStateProps {
  icon: IconName
  title: string
  description?: string
  action?: EmptyStateAction
  variant?: EmptyStateVariant
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const IconComponent = Icons[icon]

  const containerClasses = {
    default: 'py-12 px-4',
    compact: 'py-6 px-3',
    inline: 'py-4 px-2',
  }

  const iconClasses = {
    default: 'w-12 h-12 mb-4',
    compact: 'w-8 h-8 mb-3',
    inline: 'w-6 h-6 mb-2',
  }

  const titleClasses = {
    default: 'text-base font-medium',
    compact: 'text-sm font-medium',
    inline: 'text-xs font-medium',
  }

  const descriptionClasses = {
    default: 'text-sm mt-1',
    compact: 'text-xs mt-1',
    inline: 'text-[11px] mt-0.5',
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center animate-fade-in',
        containerClasses[variant],
        className
      )}
    >
      <IconComponent
        className={cn(
          'text-content-muted opacity-50',
          iconClasses[variant]
        )}
      />
      <p className={cn('text-content-secondary', titleClasses[variant])}>
        {title}
      </p>
      {description && (
        <p className={cn('text-content-muted', descriptionClasses[variant])}>
          {description}
        </p>
      )}
      {action && variant !== 'inline' && (
        <Button
          variant={action.variant ?? 'secondary'}
          size={variant === 'compact' ? 'sm' : 'md'}
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

export function EmptyStateMessage({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'text-center py-8 text-content-muted text-sm animate-fade-in',
        className
      )}
    >
      {children}
    </div>
  )
}

import { forwardRef } from 'react'
import { cn } from '../../lib/utils'
import { card, type CardVariant } from '../../lib/theme'

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  hover?: boolean
}

const paddingMap: Record<CardPadding, string> = {
  none: '',
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', hover = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          card.base,
          card.variant[variant],
          paddingMap[padding],
          hover && 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  action?: React.ReactNode
}

export function CardHeader({ title, action, children, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 border-b border-white/10',
        className
      )}
      {...props}
    >
      {title ? (
        <>
          <h3 className="font-medium text-sm text-white">{title}</h3>
          {action}
        </>
      ) : (
        children
      )}
    </div>
  )
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('p-3', className)} {...props}>
      {children}
    </div>
  )
}


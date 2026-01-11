import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

type IconButtonVariant = 'ghost' | 'subtle' | 'solid'
type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
}

const variants: Record<IconButtonVariant, string> = {
  ghost: 'text-content-muted hover:text-white hover:bg-surface-hover',
  subtle: 'text-content-secondary bg-surface-tertiary hover:bg-surface-hover',
  solid: 'text-white bg-blue-600 hover:bg-blue-700',
}

const sizes: Record<IconButtonSize, string> = {
  xs: 'p-0.5',
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = 'ghost', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(
          'rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-surface-primary disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'

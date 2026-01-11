import { forwardRef } from 'react'
import { cn } from '../../lib/utils'
import { button, type ButtonVariant, type ButtonSize } from '../../lib/theme'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          button.base,
          button.variant[variant],
          button.size[size],
          'hover:scale-[1.02] active:scale-[0.98]',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="w-4 h-4 animate-spin mr-2"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : icon && iconPosition === 'left' ? (
          <span className="mr-2 flex-shrink-0">{icon}</span>
        ) : null}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className="ml-2 flex-shrink-0">{icon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

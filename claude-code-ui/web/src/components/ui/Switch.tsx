import { cn } from '../../lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
}: SwitchProps) {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
  }

  const s = sizes[size]

  return (
    <label className={cn('flex items-center gap-2', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          s.track,
          'relative inline-flex items-center rounded-full transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-surface-primary',
          checked ? 'bg-blue-500' : 'bg-surface-input',
          !disabled && 'cursor-pointer'
        )}
      >
        <span
          className={cn(
            s.thumb,
            'absolute left-0.5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && s.translate
          )}
        />
      </button>
      {label && (
        <span className="text-xs text-content-muted select-none">{label}</span>
      )}
    </label>
  )
}

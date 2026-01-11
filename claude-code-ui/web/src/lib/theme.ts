export const colors = {
  bg: {
    primary: '#0d0d0d',
    secondary: '#111111',
    tertiary: '#1a1a1a',
    input: '#1f1f1f',
    header: '#141414',
    hover: '#252525',
  },
  border: {
    primary: '#2a2a2a',
    secondary: '#333333',
  },
}

export const tw = {
  bg: {
    primary: 'bg-surface-primary',
    secondary: 'bg-surface-secondary',
    tertiary: 'bg-surface-tertiary',
    input: 'bg-surface-input',
    header: 'bg-surface-header',
    hover: 'hover:bg-surface-hover',
  },
  border: {
    primary: 'border-stroke-primary',
    secondary: 'border-stroke-secondary',
  },
  radius: {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  },
  text: {
    micro: 'text-[11px]',
    xs: 'text-xs',
    sm: 'text-sm',
    primary: 'text-content-primary',
    secondary: 'text-content-secondary',
    muted: 'text-content-muted',
    subtle: 'text-content-subtle',
    dimmed: 'text-content-dimmed',
  },
}

export const status = {
  running: {
    text: 'text-status-running',
    bg: 'bg-status-running-bg',
    border: 'border-status-running/30',
    dot: 'bg-status-running',
  },
  success: {
    text: 'text-status-success',
    bg: 'bg-status-success-bg',
    border: 'border-status-success/30',
    dot: 'bg-status-success',
  },
  error: {
    text: 'text-status-error',
    bg: 'bg-status-error-bg',
    border: 'border-status-error/30',
    dot: 'bg-status-error',
  },
  warning: {
    text: 'text-status-warning',
    bg: 'bg-status-warning-bg',
    border: 'border-status-warning/30',
    dot: 'bg-status-warning',
  },
  info: {
    text: 'text-status-info',
    bg: 'bg-status-info-bg',
    border: 'border-status-info/30',
    dot: 'bg-status-info',
  },
  pending: {
    text: 'text-status-pending',
    bg: 'bg-status-pending-bg',
    border: 'border-status-pending/30',
    dot: 'bg-status-pending',
  },
} as const

export const modes = {
  orchestrate: {
    active: 'bg-mode-orchestrate text-white',
    inactive: 'text-content-muted hover:text-white',
  },
  plan: {
    active: 'bg-mode-plan text-white',
    inactive: 'text-content-muted hover:text-white',
  },
  think: {
    active: 'bg-mode-think text-white',
    inactive: 'text-content-muted hover:text-white',
  },
  bypass: {
    active: 'bg-mode-bypass text-white',
    inactive: 'text-content-muted hover:text-white',
  },
} as const

export const button = {
  base: 'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-primary disabled:opacity-50 disabled:cursor-not-allowed',
  variant: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-surface-tertiary border border-stroke-primary text-content-secondary hover:bg-surface-hover focus:ring-gray-500',
    ghost: 'text-content-secondary hover:text-white hover:bg-surface-hover focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
  },
  size: {
    xs: 'px-2 py-1 text-xs rounded',
    sm: 'px-2.5 py-1.5 text-xs rounded-md',
    md: 'px-3 py-2 text-sm rounded-lg',
    lg: 'px-4 py-2.5 text-sm rounded-lg',
  },
} as const

export const card = {
  base: 'rounded-lg border transition-all duration-200 ease-out',
  variant: {
    default: 'bg-surface-secondary border-stroke-primary hover:border-stroke-secondary',
    outlined: 'bg-transparent border-stroke-secondary hover:border-content-dimmed',
    elevated: 'bg-surface-secondary border-stroke-primary shadow-card hover:shadow-card-hover',
    agent: 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50 hover:shadow-glow-orange',
    tool: 'bg-surface-tertiary border-stroke-primary hover:border-stroke-secondary',
    interactive: 'bg-surface-secondary border-stroke-primary hover:border-purple-500/50 hover:shadow-glow-purple cursor-pointer',
  },
} as const

export type StatusType = keyof typeof status
export type ButtonVariant = keyof typeof button.variant
export type ButtonSize = keyof typeof button.size
export type CardVariant = keyof typeof card.variant

import { useEffect, useState } from 'react'
import { tw } from '../../lib/theme'
import { cn } from '../../lib/utils'
import { Icons } from '../../lib/icons'
import { TOAST_DURATION_MS } from '../../lib/constants'

export interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  onClose: (id: string) => void
}

const typeStyles = {
  success: {
    bg: 'bg-emerald-900/90',
    border: 'border-emerald-700',
    icon: 'text-emerald-400',
  },
  error: {
    bg: 'bg-red-900/90',
    border: 'border-red-700',
    icon: 'text-red-400',
  },
  info: {
    bg: 'bg-blue-900/90',
    border: 'border-blue-700',
    icon: 'text-blue-400',
  },
  warning: {
    bg: 'bg-amber-900/90',
    border: 'border-amber-700',
    icon: 'text-amber-400',
  },
}

const iconMap = {
  success: Icons.success,
  error: Icons.error,
  info: Icons.info,
  warning: Icons.warning,
}

export default function Toast({ id, message, type, onClose }: ToastProps): JSX.Element {
  const [isExiting, setIsExiting] = useState(false)
  const styles = typeStyles[type]

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
    }, TOAST_DURATION_MS - 150) // Start exit animation 150ms before auto-dismiss

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onClose(id)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isExiting, id, onClose])

  const handleClose = (): void => {
    setIsExiting(true)
  }

  const IconComponent = iconMap[type]

  return (
    <div
      className={cn(
        styles.bg,
        styles.border,
        'border',
        tw.radius.lg,
        'flex items-center gap-3 px-4 py-3 shadow-lg min-w-[300px] max-w-[400px] pointer-events-auto',
        isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
      )}
      role="alert"
    >
      <div className={cn(styles.icon, 'flex-shrink-0')}>
        <IconComponent className="w-5 h-5" />
      </div>
      <p className="text-sm text-white flex-1">{message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 -mr-1"
        aria-label="Close notification"
      >
        <Icons.x className="w-4 h-4" />
      </button>
    </div>
  )
}

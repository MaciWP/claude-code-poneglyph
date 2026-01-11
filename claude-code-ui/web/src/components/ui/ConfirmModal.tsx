import { useEffect, useRef, useCallback } from 'react'
import { tw } from '../../lib/theme'
import { cn } from '../../lib/utils'
import { Icons } from '../../lib/icons'
import { Button } from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

const variantConfig = {
  danger: {
    buttonVariant: 'danger' as const,
    icon: Icons.warning,
    iconColor: 'text-red-400',
  },
  warning: {
    buttonVariant: 'primary' as const,
    icon: Icons.info,
    iconColor: 'text-amber-400',
  },
  info: {
    buttonVariant: 'primary' as const,
    icon: Icons.info,
    iconColor: 'text-blue-400',
  },
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps): JSX.Element | null {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const config = variantConfig[variant]
  const IconComponent = config.icon

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter') {
        onConfirm()
      }
    },
    [onCancel, onConfirm]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      confirmButtonRef.current?.focus()
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={cn(
          tw.bg.secondary,
          tw.border.primary,
          'border',
          tw.radius.lg,
          'p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-in'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-start gap-4">
          <div className={cn(config.iconColor, 'flex-shrink-0 mt-0.5')}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 id="modal-title" className="text-lg font-semibold text-white">
              {title}
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={config.buttonVariant}
            size="md"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

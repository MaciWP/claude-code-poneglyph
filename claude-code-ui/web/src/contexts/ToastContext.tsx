import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

export interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (message: string, type: ToastType) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const MAX_TOASTS = 3

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string): void => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType): void => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    setToasts((prev) => {
      const newToasts = [...prev, { id, message, type }]
      if (newToasts.length > MAX_TOASTS) {
        return newToasts.slice(-MAX_TOASTS)
      }
      return newToasts
    })
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

import { useToast } from '../../contexts/ToastContext'
import Toast from './Toast'

export default function ToastContainer(): JSX.Element {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={removeToast}
        />
      ))}
    </div>
  )
}

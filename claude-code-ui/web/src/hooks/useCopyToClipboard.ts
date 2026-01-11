import { useState, useCallback, useRef, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { COPY_FEEDBACK_MS } from '../lib/constants'

interface UseCopyToClipboardReturn {
  copied: boolean
  copy: (text: string, successMessage?: string) => Promise<boolean>
}

export function useCopyToClipboard(): UseCopyToClipboardReturn {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copy = useCallback(
    async (text: string, successMessage = 'Copied to clipboard'): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        showToast(successMessage, 'success')

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)

        return true
      } catch {
        showToast('Failed to copy', 'error')
        return false
      }
    },
    [showToast]
  )

  return { copied, copy }
}

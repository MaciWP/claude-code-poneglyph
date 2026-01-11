import { useState } from 'react'
import { Icons } from '../../../../lib/icons'
import { useToast } from '../../../../contexts/ToastContext'

interface CopyButtonProps {
  content: string
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export default function CopyButton({
  content,
  size = 'sm',
  showLabel = true,
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      showToast('Copied to clipboard', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  const sizeClasses = size === 'sm' ? 'text-xs' : 'text-sm'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <button
      onClick={handleCopy}
      className={`text-gray-600 hover:text-gray-300 transition-colors ${sizeClasses} ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Icons.check className={`${iconSize} inline`} />
          {showLabel && ' Copied'}
        </>
      ) : (
        showLabel ? 'Copy' : <Icons.copy className={iconSize} />
      )}
    </button>
  )
}

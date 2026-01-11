import { memo, useRef, useCallback, useEffect } from 'react'
import type { PastedImage } from '../../types/chat'
import { Icons } from '../../lib/icons'
import { useAutoResize } from '../../hooks/useAutoResize'

interface Props {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onQueue: () => void
  onPaste: (e: React.ClipboardEvent) => void
  pastedImages: PastedImage[]
  onRemoveImage: (id: string) => void
  onExpandImage: (image: PastedImage) => void
  isConnected: boolean
  isProcessing: boolean
  hasQueuedMessage: boolean
  onAbort?: () => void
  waitingForAnswer?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

export default memo(function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onQueue,
  onPaste,
  pastedImages,
  onRemoveImage,
  onExpandImage,
  isConnected,
  isProcessing,
  hasQueuedMessage,
  onAbort,
  waitingForAnswer,
  onFocus,
  onBlur,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Textarea only disabled when not connected or waiting for answer
  // Allow typing during processing to queue messages (like Claude Code)
  const isInputDisabled = !isConnected || waitingForAnswer
  // Submit disabled when not connected or waiting for answer (but NOT during processing - can queue)
  const canSubmit = isConnected && !waitingForAnswer && (input.trim() || pastedImages.length > 0)
  // Queue disabled if already has queued message
  const canQueue = isProcessing && canSubmit && !hasQueuedMessage

  // Auto-resize textarea
  useAutoResize(textareaRef, 1, 10)

  // Reset height when input is cleared
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without Shift = submit or queue
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (isProcessing && canQueue) {
          onQueue()
        } else if (!isProcessing && canSubmit) {
          onSubmit(e)
        }
      }
      // Shift+Enter = new line (default textarea behavior)
    },
    [isProcessing, canQueue, canSubmit, onQueue, onSubmit]
  )

  const placeholder = !isConnected
    ? 'Connecting...'
    : waitingForAnswer
      ? '⚠️ Answer the question above first...'
      : hasQueuedMessage
        ? '✓ Message queued. Will send after current task...'
        : isProcessing
          ? 'Type to queue next message... (Enter to queue)'
          : 'Type a message... (Shift+Enter for new line, Ctrl+V to paste images)'

  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-stroke-primary">
      {pastedImages.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {pastedImages.map(img => (
            <div key={img.id} className="relative group">
              <img
                src={img.dataUrl}
                alt="Pasted"
                className="h-16 w-16 object-cover rounded border border-stroke-primary cursor-pointer hover:border-blue-500 transition-all duration-150 ease-out hover:scale-105"
                onClick={() => onExpandImage(img)}
              />
              <button
                type="button"
                onClick={() => onRemoveImage(img.id)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110 active:scale-95"
              >
                <Icons.x className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onPaste={onPaste}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={1}
          className={`flex-1 px-4 py-3 bg-surface-input border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 font-mono text-sm transition-all duration-150 ease-out resize-none ${
            waitingForAnswer
              ? 'border-yellow-500/50 focus:border-yellow-500 focus:ring-yellow-500/20'
              : hasQueuedMessage
                ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/20'
                : isProcessing
                  ? 'border-orange-500/30 focus:border-orange-500 focus:ring-orange-500/20'
                  : 'border-stroke-primary focus:border-blue-500 focus:ring-blue-500/20'
          }`}
          disabled={isInputDisabled || hasQueuedMessage}
        />
        {isProcessing ? (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onQueue}
              disabled={!canQueue}
              className="px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-150 ease-out flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
              title={hasQueuedMessage ? 'Message already queued' : 'Queue message'}
            >
              <Icons.clock className="w-4 h-4" />
              <span>{hasQueuedMessage ? 'Queued' : 'Queue'}</span>
            </button>
            {onAbort && (
              <button
                type="button"
                onClick={onAbort}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-150 ease-out flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                title="Stop (Esc Esc)"
              >
                <Icons.stop className="w-4 h-4" />
                <span>Stop</span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-150 ease-out flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 shrink-0"
          >
            <Icons.send className="w-4 h-4" />
            <span>Send</span>
          </button>
        )}
      </div>
    </form>
  )
})

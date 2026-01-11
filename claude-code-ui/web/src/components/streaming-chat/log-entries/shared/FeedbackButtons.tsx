import { useState } from 'react'
import { sendMemoryFeedback } from '../../../../lib/api'

interface FeedbackButtonsProps {
  entryId: string
  content: string
  sessionId?: string
}

export default function FeedbackButtons({
  entryId,
  content,
  sessionId,
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)
  const [sending, setSending] = useState(false)

  async function handleFeedback(type: 'positive' | 'negative') {
    if (sending || feedback) return
    setSending(true)
    try {
      await sendMemoryFeedback({
        memoryId: entryId,
        type,
        context: content.slice(0, 200),
        sessionId,
      })
      setFeedback(type)
    } catch (error) {
      console.error('Failed to send feedback:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleFeedback('positive')}
        disabled={sending || feedback !== null}
        className={`text-xs px-1 py-0.5 rounded transition-colors ${
          feedback === 'positive'
            ? 'text-green-400'
            : feedback === 'negative'
              ? 'text-gray-700'
              : 'text-gray-600 hover:text-green-400'
        }`}
        title="Good response"
      >
        +
      </button>
      <button
        onClick={() => handleFeedback('negative')}
        disabled={sending || feedback !== null}
        className={`text-xs px-1 py-0.5 rounded transition-colors ${
          feedback === 'negative'
            ? 'text-red-400'
            : feedback === 'positive'
              ? 'text-gray-700'
              : 'text-gray-600 hover:text-red-400'
        }`}
        title="Poor response"
      >
        -
      </button>
    </div>
  )
}

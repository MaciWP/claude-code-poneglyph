import { useState } from 'react'
import type { LogEntry } from '../../../types/chat'
import { Icons } from '../../../lib/icons'

interface AskUserQuestionOption {
  label: string
  description?: string
}

interface AskUserQuestion {
  question: string
  header?: string
  multiSelect?: boolean
  options?: AskUserQuestionOption[]
}

interface AskUserQuestionInput {
  questions?: AskUserQuestion[]
}

interface AskUserQuestionViewProps {
  entry: LogEntry
  onSendMessage?: (message: string) => void
}

export default function AskUserQuestionView({ entry, onSendMessage }: AskUserQuestionViewProps) {
  const [customAnswer, setCustomAnswer] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string[]>>({})
  const [submitted, setSubmitted] = useState(false)

  const input = entry.toolInput as AskUserQuestionInput | undefined

  function toggleOption(questionIdx: number, option: string) {
    if (submitted) return
    setSelectedOptions(prev => {
      const current = prev[questionIdx] || []
      const isSelected = current.includes(option)
      return {
        ...prev,
        [questionIdx]: isSelected
          ? current.filter(o => o !== option)
          : [...current, option]
      }
    })
  }

  function handleSubmit() {
    if (submitted || !onSendMessage) return
    const allSelected = Object.values(selectedOptions).flat()
    if (allSelected.length === 0 && !customAnswer.trim()) return

    setSubmitted(true)
    const response = customAnswer.trim() || allSelected.join(', ')
    onSendMessage(response)
  }

  const hasSelection = Object.values(selectedOptions).flat().length > 0 || customAnswer.trim()

  return (
    <div className="py-2">
      <div className={`bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 ${submitted ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span className="text-yellow-400">?</span>
          <span className="text-yellow-400 font-medium">Question</span>
          {submitted && <span className="text-green-400 ml-2 flex items-center gap-1"><Icons.check className="w-3 h-3" /> Answered</span>}
          {!submitted && <span className="text-orange-400 ml-2 animate-pulse">Waiting for your answer...</span>}
          <span className="ml-auto text-gray-600">{entry.timestamp.toLocaleTimeString()}</span>
        </div>
        {input?.questions?.map((q, idx) => (
          <div key={idx} className="mb-3 last:mb-0">
            <div className="text-sm text-gray-200 mb-3">{q.question}</div>
            {q.options && q.options.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {q.options.map((opt, optIdx) => {
                  const isSelected = (selectedOptions[idx] || []).includes(opt.label)
                  return (
                    <button
                      key={optIdx}
                      onClick={() => toggleOption(idx, opt.label)}
                      disabled={submitted}
                      className={`px-3 py-1.5 rounded-lg text-left transition-all ${
                        submitted
                          ? 'bg-yellow-500/10 border border-yellow-500/20 cursor-default'
                          : isSelected
                            ? 'bg-yellow-500/40 border-2 border-yellow-400 cursor-pointer'
                            : 'bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30 hover:border-yellow-400/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-[11px] ${
                          isSelected ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-yellow-400/50'
                        }`}>
                          {isSelected && <Icons.check className="w-3 h-3" />}
                        </span>
                        <div>
                          <div className="text-xs text-yellow-300 font-medium">{opt.label}</div>
                          {opt.description && (
                            <div className="text-[11px] text-yellow-400/60 mt-0.5">{opt.description}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* Custom answer input + Submit button */}
        {!submitted && onSendMessage && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-yellow-500/20">
            <input
              type="text"
              value={customAnswer}
              onChange={(e) => setCustomAnswer(e.target.value)}
              placeholder="Or type a custom answer..."
              className="flex-1 bg-black/30 border border-yellow-500/20 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
            />
            <button
              onClick={handleSubmit}
              disabled={!hasSelection}
              className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${
                hasSelection
                  ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                  : 'bg-yellow-500/30 text-yellow-300/50 cursor-not-allowed'
              }`}
            >
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * BottomControlsArea - UI/UX Feature 3
 *
 * Container layout para controles en la parte inferior del chat:
 * StatsBar + ModeToggles + QuickToolsBar + ChatInput
 */

import { memo } from 'react'
import type { ClaudeModes } from '../../App'
import type { TokenUsage, QuickToolItem, QuickToolsState } from '../../types/chat'
import type { LearningEvent } from '../LearningIndicator'
import type { PastedImage } from '../../types/chat'
import type { ContextWindowState } from '../../hooks/useContextWindow'
import StatsBar from '../StatsBar'
import ModeToggles from './ModeToggles'
import QuickToolsBar from './QuickToolsBar'
import ChatInput from './ChatInput'

interface SessionStats {
  messageCount: number
  toolUseCount: number
}

interface Props {
  // StatsBar props
  sessionStats: SessionStats
  isConnected: boolean
  isProcessing: boolean
  responseTime?: number
  usage?: TokenUsage
  learningEvents?: LearningEvent[]
  contextWindow?: ContextWindowState
  isContextCompacting?: boolean
  contextCompactionSaved?: number | null

  // ModeToggles props
  modes?: ClaudeModes
  onModeToggle?: (mode: keyof ClaudeModes) => void

  // QuickToolsBar props
  quickToolsState: QuickToolsState
  onSelectTool: (tool: QuickToolItem) => void

  // ChatInput props
  input: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onQueue: () => void
  onPaste: (e: React.ClipboardEvent) => void
  pastedImages: PastedImage[]
  onRemoveImage: (id: string) => void
  onExpandImage: (image: PastedImage) => void
  hasQueuedMessage?: boolean
  onAbort?: () => void
  waitingForAnswer?: boolean
  onInputFocus?: () => void
  onInputBlur?: () => void
}

export default memo(function BottomControlsArea({
  // StatsBar
  sessionStats,
  isConnected,
  isProcessing,
  responseTime,
  usage,
  learningEvents = [],
  contextWindow,
  isContextCompacting = false,
  contextCompactionSaved,
  // ModeToggles
  modes,
  onModeToggle,
  // QuickToolsBar
  quickToolsState,
  onSelectTool,
  // ChatInput
  input,
  onInputChange,
  onSubmit,
  onQueue,
  onPaste,
  pastedImages,
  onRemoveImage,
  onExpandImage,
  hasQueuedMessage = false,
  onAbort,
  waitingForAnswer = false,
  onInputFocus,
  onInputBlur,
}: Props) {
  return (
    <div className="border-t border-stroke-primary bg-surface-primary">
      {/* Stats Bar - Compact version for bottom */}
      <StatsBar
        sessionStats={sessionStats}
        isConnected={isConnected}
        isProcessing={isProcessing}
        responseTime={responseTime}
        usage={usage}
        learningEvents={learningEvents}
        contextWindow={contextWindow}
        isContextCompacting={isContextCompacting}
        contextCompactionSaved={contextCompactionSaved}
      />

      {/* Quick Tools Bar - Aparece cuando input tiene focus */}
      <QuickToolsBar
        state={quickToolsState}
        onSelectTool={onSelectTool}
      />

      {/* Mode Toggles - Solo si onModeToggle está disponible */}
      {modes && onModeToggle && (
        <div className="px-4 py-2 border-t border-stroke-secondary bg-surface-secondary">
          <ModeToggles modes={modes} onToggle={onModeToggle} />
        </div>
      )}

      {/* Chat Input */}
      <ChatInput
        input={input}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        onQueue={onQueue}
        onPaste={onPaste}
        pastedImages={pastedImages}
        onRemoveImage={onRemoveImage}
        onExpandImage={onExpandImage}
        isConnected={isConnected}
        isProcessing={isProcessing}
        hasQueuedMessage={hasQueuedMessage}
        onAbort={onAbort}
        waitingForAnswer={waitingForAnswer}
        onFocus={onInputFocus}
        onBlur={onInputBlur}
      />
    </div>
  )
})

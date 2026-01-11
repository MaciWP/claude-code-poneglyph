import { useState } from 'react'
import type { Session, ModelProvider } from '../../lib/api'
import { Icons } from '../../lib/icons'
import { Button } from '../ui'
import SessionDropdown from '../SessionDropdown'
import { ProviderSelector } from './ProviderSelector'
import { SettingsModal } from './SettingsModal'

interface AppHeaderProps {
  provider: ModelProvider
  onProviderChange: (provider: ModelProvider) => void
  workDir: string
  onWorkDirChange: (dir: string) => void
  allowFullPC: boolean
  onAllowFullPCChange: (allow: boolean) => void
  sessions: Session[]
  activeSession: Session | null
  onSelectSession: (session: Session) => void
  onCreateSession: () => void
  onViewAllSessions: () => void
}

export function AppHeader({
  provider,
  onProviderChange,
  workDir,
  onWorkDirChange,
  allowFullPC,
  onAllowFullPCChange,
  sessions,
  activeSession,
  onSelectSession,
  onCreateSession,
  onViewAllSessions,
}: AppHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-surface-tertiary border-b border-stroke-primary">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <h1 className="text-lg font-semibold text-white">Claude Code UI</h1>
        </div>

        {/* Center: Provider Selector */}
        <div className="flex items-center">
          <ProviderSelector value={provider} onChange={onProviderChange} />
        </div>

        {/* Right: Settings + Sessions + New */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg bg-surface-secondary border border-stroke-primary hover:bg-surface-hover hover:border-stroke-secondary transition-all duration-150 text-content-muted hover:text-content-secondary"
            aria-label="Settings"
          >
            <Icons.settings className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-stroke-primary" />

          <SessionDropdown
            sessions={sessions}
            activeSession={activeSession}
            onSelect={onSelectSession}
            onCreateNew={onCreateSession}
            onViewAll={onViewAllSessions}
          />

          <Button
            variant="success"
            size="md"
            onClick={onCreateSession}
            icon={<Icons.plus className="w-4 h-4" />}
          >
            New
          </Button>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        workDir={workDir}
        onWorkDirChange={onWorkDirChange}
        allowFullPC={allowFullPC}
        onAllowFullPCChange={onAllowFullPCChange}
      />
    </>
  )
}

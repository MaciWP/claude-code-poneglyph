import { useState, useEffect, useMemo } from 'react'
import StreamingChat from './components/StreamingChat'
import SessionList from './components/SessionList'
import { Observatory } from './components/observatory'
import { SkillsIDE } from './components/skills'
import { ConfigCenter } from './components/config'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { TabContext, type AppTab } from './contexts/TabContext'
import ToastContainer from './components/ui/ToastContainer'
import { Session, ModelProvider, createSession, getSessions, getSession } from './lib/api'
import { Icons } from './lib/icons'
import { useLocalStorage } from './hooks/useLocalStorage'
import { STORAGE_KEYS } from './types/preferences'
import { Button, IconButton } from './components/ui'
import { AppHeader } from './components/header'

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
        active
          ? 'bg-surface-tertiary text-white border border-stroke-secondary'
          : 'text-content-muted hover:text-content-secondary hover:bg-surface-hover border border-transparent',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

export interface ClaudeModes {
  orchestrate: boolean
  planMode: boolean
  bypassPermissions: boolean
  allowFullPC: boolean
}

function AppContent() {
  const { showToast } = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [activeTab, setActiveTab] = useState<AppTab>('chat')
  const [provider, setProvider] = useLocalStorage<ModelProvider>(STORAGE_KEYS.PROVIDER, 'claude')
  const [orchestrate, setOrchestrate] = useLocalStorage(STORAGE_KEYS.ORCHESTRATE, true)
  const [planMode, setPlanMode] = useLocalStorage(STORAGE_KEYS.PLAN, false)
  const [bypassPermissions, setBypassPermissions] = useLocalStorage(STORAGE_KEYS.BYPASS, false)
  const [workDir, setWorkDir] = useLocalStorage(STORAGE_KEYS.WORK_DIR, '')
  const [allowFullPC, setAllowFullPC] = useLocalStorage(STORAGE_KEYS.ALLOW_FULL_PC, false)

  const modes = useMemo<ClaudeModes>(
    () => ({
      orchestrate,
      planMode,
      bypassPermissions,
      allowFullPC,
    }),
    [orchestrate, planMode, bypassPermissions, allowFullPC]
  )

  const handleModeToggle = (mode: keyof ClaudeModes) => {
    switch (mode) {
      case 'orchestrate':
        if (!orchestrate) {
          setPlanMode(false)
        }
        setOrchestrate(!orchestrate)
        break
      case 'planMode':
        if (!planMode) {
          setOrchestrate(false)
        }
        setPlanMode(!planMode)
        break
      case 'bypassPermissions':
        setBypassPermissions(!bypassPermissions)
        break
      case 'allowFullPC':
        setAllowFullPC(!allowFullPC)
        break
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      const data = await getSessions()
      setSessions(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      showToast(`Error loading sessions: ${message}`, 'error')
    } finally {
      setLoadingSessions(false)
    }
  }

  async function handleCreateSession() {
    try {
      const session = await createSession({ name: '', workDir: workDir || '' })
      setSessions([session, ...sessions])
      setActiveSession(session)
      showToast('Session created', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      showToast(`Error: ${message}`, 'error')
    }
  }

  async function handleSessionUpdate() {
    await loadSessions()
    // También actualizar la sesión activa con datos frescos
    if (activeSession) {
      try {
        const freshSession = await getSession(activeSession.id)
        if (freshSession) {
          setActiveSession(freshSession)
        }
      } catch {
        // Ignorar errores, loadSessions ya actualiza la lista
      }
    }
  }

  async function handleSelectSession(session: Session) {
    try {
      const freshSession = await getSession(session.id)
      if (freshSession) {
        setActiveSession(freshSession)
      } else {
        loadSessions()
      }
      setShowAllSessions(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      showToast(`Error: ${message}`, 'error')
    }
  }

  return (
    <TabContext.Provider value={{ setActiveTab }}>
      <div className="h-screen flex flex-col bg-surface-primary">
        <AppHeader
          provider={provider}
          onProviderChange={setProvider}
          workDir={workDir}
          onWorkDirChange={setWorkDir}
          allowFullPC={allowFullPC}
          onAllowFullPCChange={setAllowFullPC}
          sessions={sessions}
          activeSession={activeSession}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onViewAllSessions={() => setShowAllSessions(true)}
        />

        <nav className="flex items-center gap-1 px-4 py-1.5 bg-surface-header border-b border-stroke-primary">
          <TabButton
            active={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            icon={<Icons.message className="w-3.5 h-3.5" />}
            label="Chat"
          />
          <TabButton
            active={activeTab === 'observatory'}
            onClick={() => setActiveTab('observatory')}
            icon={<Icons.activity className="w-3.5 h-3.5" />}
            label="Observatory"
          />
          <TabButton
            active={activeTab === 'skills'}
            onClick={() => setActiveTab('skills')}
            icon={<Icons.puzzle className="w-3.5 h-3.5" />}
            label="Skills IDE"
          />
          <TabButton
            active={activeTab === 'config'}
            onClick={() => setActiveTab('config')}
            icon={<Icons.settings className="w-3.5 h-3.5" />}
            label="Config"
          />
        </nav>

        <main className="flex-1 overflow-hidden">
          {activeTab === 'chat' &&
            (activeSession ? (
              <StreamingChat
                session={activeSession}
                modes={modes}
                provider={provider}
                onSessionUpdate={handleSessionUpdate}
                onExitPlanMode={() => setPlanMode(false)}
                onModeToggle={handleModeToggle}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-content-subtle">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-surface-input rounded-2xl flex items-center justify-center">
                    <Icons.message className="w-8 h-8 text-content-muted" />
                  </div>
                  <p className="text-lg mb-2 text-content-secondary">No session selected</p>
                  <p className="text-sm text-content-dimmed mb-4">
                    Create a new session to start chatting with Claude Code
                  </p>
                  <Button variant="primary" size="lg" onClick={handleCreateSession}>
                    Create New Session
                  </Button>
                </div>
              </div>
            ))}
          {activeTab === 'observatory' && <Observatory />}
          {activeTab === 'skills' && <SkillsIDE />}
          {activeTab === 'config' && <ConfigCenter />}
        </main>

        {showAllSessions && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={() => setShowAllSessions(false)}
          >
            <div
              className="bg-surface-tertiary border border-stroke-primary rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-stroke-primary">
                <h2 className="text-lg font-semibold text-white">All Sessions</h2>
                <IconButton label="Close" onClick={() => setShowAllSessions(false)}>
                  <Icons.x className="w-5 h-5" />
                </IconButton>
              </div>
              <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
                <SessionList
                  sessions={sessions}
                  activeSession={activeSession}
                  onSelect={handleSelectSession}
                  onRefresh={loadSessions}
                  loading={loadingSessions}
                />
              </div>
            </div>
          </div>
        )}
        <ToastContainer />
      </div>
    </TabContext.Provider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  )
}

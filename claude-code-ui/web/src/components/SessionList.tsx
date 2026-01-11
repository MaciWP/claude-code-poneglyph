import { useState, useCallback } from 'react'
import { Session, deleteSession, deleteAllSessions } from '../lib/api'
import { formatDate } from '../lib/utils'
import ConfirmModal from './ui/ConfirmModal'
import { useToast } from '../contexts/ToastContext'

interface ConfirmState {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
}

interface Props {
  sessions: Session[]
  activeSession: Session | null
  onSelect: (session: Session) => void
  onRefresh: () => void
  loading?: boolean
}

export default function SessionList({ sessions, activeSession, onSelect, onRefresh }: Props) {
  const { showToast } = useToast()
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const closeModal = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }))
  }, [])

  function handleDelete(e: React.MouseEvent, session: Session) {
    e.stopPropagation()
    setConfirmState({
      isOpen: true,
      title: 'Delete Session',
      message: `Delete session "${session.name || 'Untitled'}"?`,
      onConfirm: async () => {
        try {
          await deleteSession(session.id)
          showToast('Session deleted', 'success')
          closeModal()
          onRefresh()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          showToast(`Error: ${message}`, 'error')
          closeModal()
        }
      },
    })
  }

  function handleDeleteAll() {
    if (sessions.length === 0) return
    setConfirmState({
      isOpen: true,
      title: 'Delete All Sessions',
      message: `Delete ALL ${sessions.length} sessions? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteAllSessions()
          showToast('All sessions deleted', 'success')
          closeModal()
          onRefresh()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          showToast(`Error: ${message}`, 'error')
          closeModal()
        }
      },
    })
  }

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2 px-2">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Sessions
        </h2>
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="text-gray-500 hover:text-red-400 text-xs"
              title="Delete all sessions"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onRefresh}
            className="text-gray-500 hover:text-white text-sm"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm px-2 py-4 text-center">
            No sessions yet
          </p>
        ) : (
          sessions.map((session) => (
            <button
              type="button"
              key={session.id}
              onClick={() => onSelect(session)}
              className={`w-full text-left p-2 rounded group ${
                activeSession?.id === session.id
                  ? 'bg-blue-600/20 border border-blue-500/50'
                  : 'hover:bg-surface-input border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {session.name || 'Untitled'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {session.workDir}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatDate(session.createdAt)}
                  </p>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleDelete(e, session)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDelete(e as unknown as React.MouseEvent, session) }}
                  className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  title="Delete"
                >
                  ×
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmState.onConfirm}
        onCancel={closeModal}
      />
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import type { Session } from '../lib/api'
import { formatDate } from '../lib/utils'
import { Icons } from '../lib/icons'

interface Props {
  sessions: Session[]
  activeSession: Session | null
  onSelect: (session: Session) => void
  onCreateNew: () => void
  onViewAll: () => void
}

export default function SessionDropdown({
  sessions,
  activeSession,
  onSelect,
  onCreateNew,
  onViewAll,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(session: Session) {
    onSelect(session)
    setIsOpen(false)
  }

  const recentSessions = sessions.slice(0, 3)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-2 px-3 py-2 bg-surface-input hover:bg-surface-hover border border-stroke-primary rounded-lg text-sm text-gray-300 transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98]"
        title="Sessions"
      >
        <Icons.clipboard className="w-4 h-4" />
        <span className="max-w-32 truncate">
          {activeSession?.name || 'Select Session'}
        </span>
        <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <Icons.chevronDown className="w-3 h-3 text-gray-500" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-surface-tertiary border border-stroke-primary rounded-lg shadow-xl z-50 overflow-hidden animate-slide-down">
          <div className="p-2 border-b border-stroke-primary">
            <div className="text-xs text-gray-500 uppercase font-semibold px-2 mb-2">
              Recent Sessions
            </div>
            {recentSessions.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500 text-center">
                No sessions yet
              </div>
            ) : (
              <div className="space-y-1">
                {recentSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelect(session)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-all duration-150 ease-out hover:scale-[1.01] active:scale-[0.99] ${
                      activeSession?.id === session.id
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-300 hover:bg-surface-hover border border-transparent'
                    }`}
                  >
                    <div className="truncate font-medium">
                      {session.name || 'Untitled'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatDate(session.createdAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 space-y-1">
            <button
              onClick={() => {
                onViewAll()
                setIsOpen(false)
              }}
              className="w-full text-left px-3 py-2 rounded text-sm text-gray-400 hover:bg-surface-hover hover:text-gray-200 transition-all duration-150 ease-out flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Icons.folder className="w-4 h-4" />
              <span>View All Sessions</span>
              {sessions.length > 3 && (
                <span className="ml-auto text-xs text-gray-600">
                  +{sessions.length - 3} more
                </span>
              )}
            </button>
            <button
              onClick={() => {
                onCreateNew()
                setIsOpen(false)
              }}
              className="w-full text-left px-3 py-2 rounded text-sm text-green-400 hover:bg-green-600/20 transition-all duration-150 ease-out flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Icons.plus className="w-4 h-4" />
              <span>New Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

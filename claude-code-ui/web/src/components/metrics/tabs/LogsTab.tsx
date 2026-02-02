import { useState, useEffect, useRef, useCallback } from 'react'
import { Icons } from '../../../lib/icons'
import { cn } from '../../../lib/utils'
import { Card, Badge, ToggleBadge, IconButton, Button, EmptyState, ConfirmModal } from '../../ui'

// =============================================================================
// TYPES
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogSource = 'orchestrator' | 'agent' | 'learning' | 'expert' | 'system'

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  source: LogSource
  message: string
  metadata?: Record<string, unknown>
  sessionId?: string
  agentId?: string
}

interface LogsResponse {
  logs: LogEntry[]
  count: number
}

interface LogsTabProps {
  // extensible for future props
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error']
const LOG_SOURCES: LogSource[] = ['orchestrator', 'agent', 'learning', 'expert', 'system']
const LIMIT_OPTIONS = [50, 100, 500, 1000] as const
const REFRESH_INTERVAL_MS = 3000

const LEVEL_COLORS: Record<LogLevel, 'gray' | 'blue' | 'amber' | 'red'> = {
  debug: 'gray',
  info: 'blue',
  warn: 'amber',
  error: 'red',
}

const SOURCE_COLORS: Record<LogSource, 'purple' | 'cyan' | 'green' | 'orange' | 'gray'> = {
  orchestrator: 'purple',
  agent: 'cyan',
  learning: 'green',
  expert: 'orange',
  system: 'gray',
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

async function fetchLogs(limit?: number): Promise<LogsResponse> {
  const params = new URLSearchParams()
  if (limit) params.set('limit', String(limit))

  const response = await fetch(`/api/logs?${params.toString()}`)
  if (!response.ok) throw new Error('Failed to fetch logs')
  return response.json()
}

async function clearLogs(): Promise<void> {
  const response = await fetch('/api/logs/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  })
  if (!response.ok) throw new Error('Failed to clear logs')
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface LogEntryRowProps {
  entry: LogEntry
  isExpanded: boolean
  onToggleExpand: () => void
}

function LogEntryRow({ entry, isExpanded, onToggleExpand }: LogEntryRowProps) {
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <div className="flex items-start gap-2 py-2 px-3 hover:bg-surface-hover/30 transition-colors">
        {/* Timestamp */}
        <span className="text-xs font-mono text-content-muted shrink-0 pt-0.5">
          {formatTimestamp(entry.timestamp)}
        </span>

        {/* Level Badge */}
        <Badge color={LEVEL_COLORS[entry.level]} size="xs" className="shrink-0">
          {entry.level.toUpperCase()}
        </Badge>

        {/* Source Badge */}
        <Badge color={SOURCE_COLORS[entry.source]} size="xs" variant="outline" className="shrink-0">
          {entry.source}
        </Badge>

        {/* Message */}
        <span className="text-sm text-content-secondary flex-1 break-words min-w-0">
          {entry.message}
        </span>

        {/* Expand Button */}
        {hasMetadata && (
          <IconButton
            label={isExpanded ? 'Collapse metadata' : 'Expand metadata'}
            size="xs"
            variant="ghost"
            onClick={onToggleExpand}
            className="shrink-0"
          >
            {isExpanded ? (
              <Icons.chevronUp className="w-3.5 h-3.5" />
            ) : (
              <Icons.chevronDown className="w-3.5 h-3.5" />
            )}
          </IconButton>
        )}
      </div>

      {/* Metadata Panel */}
      {isExpanded && hasMetadata && (
        <div className="px-3 pb-2 pl-20">
          <pre className="text-xs font-mono bg-surface-tertiary p-2 rounded overflow-x-auto text-content-muted">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

interface FilterBarProps {
  levelFilters: Set<LogLevel>
  sourceFilters: Set<LogSource>
  searchTerm: string
  limit: number
  isPaused: boolean
  autoScroll: boolean
  onToggleLevel: (level: LogLevel) => void
  onToggleSource: (source: LogSource) => void
  onSearchChange: (term: string) => void
  onLimitChange: (limit: number) => void
  onTogglePause: () => void
  onToggleAutoScroll: () => void
  onExport: (format: 'json' | 'text') => void
  onClear: () => void
}

function FilterBar({
  levelFilters,
  sourceFilters,
  searchTerm,
  limit,
  isPaused,
  autoScroll,
  onToggleLevel,
  onToggleSource,
  onSearchChange,
  onLimitChange,
  onTogglePause,
  onToggleAutoScroll,
  onExport,
  onClear,
}: FilterBarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-3 p-3 border-b border-white/10">
      {/* Row 1: Level and Source Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Level Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-content-muted mr-1">Level:</span>
          {LOG_LEVELS.map((level) => (
            <ToggleBadge
              key={level}
              active={levelFilters.has(level)}
              onClick={() => onToggleLevel(level)}
              color={LEVEL_COLORS[level]}
              size="xs"
            >
              {level}
            </ToggleBadge>
          ))}
        </div>

        {/* Source Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-content-muted mr-1">Source:</span>
          {LOG_SOURCES.map((source) => (
            <ToggleBadge
              key={source}
              active={sourceFilters.has(source)}
              onClick={() => onToggleSource(source)}
              color={SOURCE_COLORS[source]}
              size="xs"
            >
              {source}
            </ToggleBadge>
          ))}
        </div>
      </div>

      {/* Row 2: Search, Limit, Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[150px]">
          <Icons.search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-tertiary border border-white/10 rounded text-white placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Limit Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-content-muted">Limit:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="text-xs bg-surface-tertiary border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Pause/Resume Button */}
        <Button
          variant="secondary"
          size="sm"
          icon={isPaused ? <Icons.play className="w-3.5 h-3.5" /> : <Icons.pause className="w-3.5 h-3.5" />}
          onClick={onTogglePause}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </Button>

        {/* Export Dropdown */}
        <div ref={exportRef} className="relative">
          <Button
            variant="secondary"
            size="sm"
            icon={<Icons.file className="w-3.5 h-3.5" />}
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            Export
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-32 bg-surface-secondary border border-white/10 rounded shadow-lg z-10">
              <button
                onClick={() => {
                  onExport('json')
                  setShowExportMenu(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-surface-hover transition-colors"
              >
                Export JSON
              </button>
              <button
                onClick={() => {
                  onExport('text')
                  setShowExportMenu(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-surface-hover transition-colors border-t border-white/5"
              >
                Export Text
              </button>
            </div>
          )}
        </div>

        {/* Clear Button */}
        <IconButton
          label="Clear logs"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Icons.trash className="w-4 h-4" />
        </IconButton>
      </div>

      {/* Auto-scroll toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleAutoScroll}
          className={cn(
            'flex items-center gap-1.5 text-xs transition-colors',
            autoScroll ? 'text-green-400' : 'text-content-muted'
          )}
        >
          {autoScroll ? (
            <Icons.check className="w-3.5 h-3.5" />
          ) : (
            <Icons.x className="w-3.5 h-3.5" />
          )}
          Auto-scroll
        </button>
      </div>
    </div>
  )
}

interface StatusBarProps {
  totalLogs: number
  displayedLogs: number
  isLoading: boolean
  autoScroll: boolean
}

function StatusBar({ totalLogs, displayedLogs, isLoading, autoScroll }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 text-xs text-content-muted">
      <div className="flex items-center gap-3">
        <span>Total: {totalLogs} logs</span>
        <span className="text-white/30">|</span>
        <span>Showing: {displayedLogs}</span>
      </div>
      <div className="flex items-center gap-3">
        {isLoading && (
          <div className="flex items-center gap-1.5">
            <Icons.loader className="w-3.5 h-3.5 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
        {autoScroll && (
          <div className="flex items-center gap-1">
            <Icons.check className="w-3 h-3 text-green-400" />
            <span className="text-green-400">Auto-scroll</span>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LogsTab(_props: LogsTabProps): JSX.Element {
  // State
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [levelFilters, setLevelFilters] = useState<Set<LogLevel>>(new Set(LOG_LEVELS))
  const [sourceFilters, setSourceFilters] = useState<Set<LogSource>>(new Set(LOG_SOURCES))
  const [searchTerm, setSearchTerm] = useState('')
  const [limit, setLimit] = useState<number>(100)
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set())
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Refs
  const logsContainerRef = useRef<HTMLDivElement>(null)
  const lastLogCountRef = useRef(0)

  // Fetch logs
  const loadLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetchLogs(limit)
      setLogs(response.logs)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  // Initial load
  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Auto-refresh
  useEffect(() => {
    if (isPaused) return

    const intervalId = setInterval(loadLogs, REFRESH_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [isPaused, loadLogs])

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && logsContainerRef.current && logs.length > lastLogCountRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
    lastLogCountRef.current = logs.length
  }, [logs, autoScroll])

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Level filter
    if (!levelFilters.has(log.level)) return false
    // Source filter
    if (!sourceFilters.has(log.source)) return false
    // Search filter
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  })

  // Handlers
  const handleToggleLevel = (level: LogLevel) => {
    setLevelFilters((prev) => {
      const next = new Set(prev)
      if (next.has(level)) {
        next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }

  const handleToggleSource = (source: LogSource) => {
    setSourceFilters((prev) => {
      const next = new Set(prev)
      if (next.has(source)) {
        next.delete(source)
      } else {
        next.add(source)
      }
      return next
    })
  }

  const handleToggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExport = (format: 'json' | 'text') => {
    window.open(`/api/logs/export?format=${format}`, '_blank')
  }

  const handleClearLogs = async () => {
    try {
      await clearLogs()
      setLogs([])
      setExpandedLogIds(new Set())
    } catch (error) {
      console.error('Failed to clear logs:', error)
    } finally {
      setShowClearConfirm(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Card variant="outlined" padding="none" className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
          <Icons.fileCode className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-white">System Logs</h3>
        </div>

        {/* Filters */}
        <FilterBar
          levelFilters={levelFilters}
          sourceFilters={sourceFilters}
          searchTerm={searchTerm}
          limit={limit}
          isPaused={isPaused}
          autoScroll={autoScroll}
          onToggleLevel={handleToggleLevel}
          onToggleSource={handleToggleSource}
          onSearchChange={setSearchTerm}
          onLimitChange={setLimit}
          onTogglePause={() => setIsPaused(!isPaused)}
          onToggleAutoScroll={() => setAutoScroll(!autoScroll)}
          onExport={handleExport}
          onClear={() => setShowClearConfirm(true)}
        />

        {/* Logs List */}
        <div
          ref={logsContainerRef}
          className="flex-1 overflow-y-auto min-h-0 bg-surface-tertiary/30"
        >
          {filteredLogs.length === 0 ? (
            <EmptyState
              icon="fileCode"
              title={logs.length === 0 ? 'No logs yet' : 'No matching logs'}
              description={
                logs.length === 0
                  ? 'Logs will appear here as the system runs'
                  : 'Try adjusting your filters'
              }
              variant="compact"
            />
          ) : (
            <div className="divide-y divide-white/5">
              {filteredLogs.map((entry) => (
                <LogEntryRow
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedLogIds.has(entry.id)}
                  onToggleExpand={() => handleToggleExpand(entry.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <StatusBar
          totalLogs={logs.length}
          displayedLogs={filteredLogs.length}
          isLoading={isLoading}
          autoScroll={autoScroll}
        />
      </Card>

      {/* Clear Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear All Logs"
        message="This will permanently delete all logs. This action cannot be undone."
        confirmText="Clear Logs"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleClearLogs}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  )
}

export default LogsTab

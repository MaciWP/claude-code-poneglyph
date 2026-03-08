import { useState, useEffect, useMemo, useCallback } from 'react'
import { Icons } from '../../lib/icons'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'

interface CommandInfo {
  name: string
  description: string
  model?: string
}

const SAFE_PREFIXES = ['load-', 'list', 'show-', 'view-', 'check-', 'status']

function isSafeCommand(name: string): boolean {
  const clean = name.replace(/^\//, '')
  return SAFE_PREFIXES.some((prefix) => clean.startsWith(prefix))
}

function CommandRow({
  command,
  onCopy,
}: {
  command: CommandInfo
  onCopy: (name: string) => void
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onCopy(command.name)}
      className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-surface-hover transition-colors group"
    >
      <span className="text-sm font-mono text-purple-400 flex-shrink-0 min-w-[140px]">
        {command.name}
      </span>
      <span className="text-xs text-content-muted truncate flex-1">{command.description}</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isSafeCommand(command.name) && (
          <Badge color="green" size="xs">
            safe
          </Badge>
        )}
        <Icons.copy className="w-3 h-3 text-content-dimmed opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  )
}

export function CommandsBrowser(): React.ReactElement {
  const [commands, setCommands] = useState<CommandInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/config/commands', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { commands: CommandInfo[] }) => {
        setCommands(data.commands ?? [])
        setLoading(false)
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => {
    if (!search) return commands
    const lower = search.toLowerCase()
    return commands.filter(
      (c) => c.name.toLowerCase().includes(lower) || c.description.toLowerCase().includes(lower)
    )
  }, [commands, search])

  const handleCopy = useCallback((name: string): void => {
    navigator.clipboard.writeText(name).then(() => {
      setCopied(name)
      setTimeout(() => setCopied(null), 1500)
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return <EmptyState icon="alertCircle" title="Failed to load commands" description={error} />
  }

  if (commands.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="terminal"
          title="No commands found"
          description="Commands will appear here when added to .claude/commands/"
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-3 space-y-2 border-b border-stroke-primary">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-content-secondary uppercase tracking-wider">
            Commands ({commands.length})
          </span>
          {copied && <span className="text-[10px] text-green-400 animate-fade-in">Copied!</span>}
        </div>
        <div className="relative">
          <Icons.search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted" />
          <input
            type="text"
            placeholder="Search commands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-input border border-stroke-primary rounded-md text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <EmptyState
            icon="search"
            title="No commands match"
            description="Try adjusting your search"
            variant="compact"
          />
        )}

        {filtered.map((cmd) => (
          <CommandRow key={cmd.name} command={cmd} onCopy={handleCopy} />
        ))}
      </div>
    </div>
  )
}

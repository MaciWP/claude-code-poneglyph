import { useState, useEffect, useMemo } from 'react'
import { cn } from '../../lib/utils'
import { Icons } from '../../lib/icons'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'

interface SkillInfo {
  name: string
  description: string
  type: string
  keywords: string[]
  lines: number
  lastModified: string
}

interface SkillBrowserProps {
  onSelectSkill: (skillName: string) => void
  selectedSkill?: string | null
}

type SkillType = 'all' | 'knowledge-base' | 'capability-uplift' | 'encoded-preference' | 'unknown'

const TYPE_BADGE_COLORS: Record<string, 'purple' | 'blue' | 'green' | 'orange' | 'gray'> = {
  'knowledge-base': 'blue',
  'capability-uplift': 'purple',
  'encoded-preference': 'green',
  unknown: 'gray',
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function SkillBrowser({
  onSelectSkill,
  selectedSkill,
}: SkillBrowserProps): React.ReactElement {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<SkillType>('all')

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/skills', { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { skills: SkillInfo[] }) => {
        setSkills(data.skills ?? [])
        setLoading(false)
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  const availableTypes = useMemo(() => {
    const types = new Set(skills.map((s) => s.type))
    return Array.from(types).sort()
  }, [skills])

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase()
    return skills.filter((skill) => {
      if (typeFilter !== 'all' && skill.type !== typeFilter) return false
      if (!search) return true
      return (
        skill.name.toLowerCase().includes(searchLower) ||
        skill.description.toLowerCase().includes(searchLower) ||
        skill.keywords.some((k) => k.toLowerCase().includes(searchLower))
      )
    })
  }, [skills, search, typeFilter])

  if (loading) {
    return (
      <div className="space-y-3 p-3">
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-stroke-primary">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-content-secondary uppercase tracking-wider">
            Skills ({skills.length})
          </span>
        </div>

        <div className="relative">
          <Icons.search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted" />
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-surface-input border border-stroke-primary rounded-md text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as SkillType)}
          className="w-full px-2 py-1.5 text-xs bg-surface-input border border-stroke-primary rounded-md text-content-secondary focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          <option value="all">All types</option>
          {availableTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.length === 0 && (
          <EmptyState
            icon="sparkles"
            title="No skills found"
            description={search ? 'Try adjusting your search' : 'No skills available'}
            variant="compact"
          />
        )}

        {filtered.map((skill) => (
          <Card
            key={skill.name}
            variant="outlined"
            padding="sm"
            className={cn(
              'cursor-pointer transition-all duration-150',
              selectedSkill === skill.name
                ? 'border-purple-500 bg-purple-500/10'
                : 'hover:border-purple-500/50'
            )}
            onClick={() => onSelectSkill(skill.name)}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-white truncate">{skill.name}</span>
                <Badge color={TYPE_BADGE_COLORS[skill.type] ?? 'gray'} size="xs">
                  {skill.type}
                </Badge>
              </div>

              {skill.description && (
                <p className="text-xs text-content-muted line-clamp-2">{skill.description}</p>
              )}

              {skill.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {skill.keywords.slice(0, 5).map((kw) => (
                    <Badge key={kw} color="gray" size="xs">
                      {kw}
                    </Badge>
                  ))}
                  {skill.keywords.length > 5 && (
                    <span className="text-[10px] text-content-dimmed">
                      +{skill.keywords.length - 5}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-content-dimmed">
                <span>{skill.lines} lines</span>
                <span>{formatRelativeTime(skill.lastModified)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

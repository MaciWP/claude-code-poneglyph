import { useState, useEffect } from 'react'
import Markdown from 'react-markdown'
import { Icons } from '../../lib/icons'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'

interface RuleInfo {
  name: string
  lines: number
  preview: string
}

function RuleCard({
  rule,
  isExpanded,
  content,
  loadingContent,
  onToggle,
}: {
  rule: RuleInfo
  isExpanded: boolean
  content: string | null
  loadingContent: boolean
  onToggle: () => void
}): React.ReactElement {
  const ChevronIcon = isExpanded ? Icons.chevronDown : Icons.chevronRight

  return (
    <Card variant="outlined" padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-hover/50 transition-colors"
      >
        <ChevronIcon className="w-4 h-4 text-content-muted flex-shrink-0" />
        <span className="text-sm font-medium text-white truncate flex-1">{rule.name}</span>
        <span className="text-[10px] text-content-dimmed flex-shrink-0">{rule.lines} lines</span>
      </button>

      {!isExpanded && rule.preview && (
        <div className="px-3 pb-2.5 -mt-1">
          <p className="text-xs text-content-muted line-clamp-2">{rule.preview}</p>
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-stroke-primary px-4 py-3 animate-fade-in">
          {loadingContent ? (
            <div className="space-y-2">
              <Skeleton className="h-4 rounded w-3/4" />
              <Skeleton className="h-4 rounded w-1/2" />
              <Skeleton className="h-4 rounded w-5/6" />
            </div>
          ) : content ? (
            <div className="prose prose-invert prose-xs max-w-none text-xs text-content-secondary [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs">
              <Markdown>{content}</Markdown>
            </div>
          ) : (
            <p className="text-xs text-content-dimmed italic">Failed to load content</p>
          )}
        </div>
      )}
    </Card>
  )
}

export function RulesViewer(): React.ReactElement {
  const [rules, setRules] = useState<RuleInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [ruleContents, setRuleContents] = useState<Map<string, string>>(new Map())
  const [loadingContent, setLoadingContent] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/config/rules', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { rules: RuleInfo[] }) => {
        setRules(data.rules ?? [])
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

  const handleToggle = (ruleName: string): void => {
    if (expandedRule === ruleName) {
      setExpandedRule(null)
      return
    }

    setExpandedRule(ruleName)

    if (ruleContents.has(ruleName)) return

    setLoadingContent(ruleName)
    fetch(`/api/config/rules/${encodeURIComponent(ruleName)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { content: string }) => {
        setRuleContents((prev) => new Map(prev).set(ruleName, data.content ?? ''))
        setLoadingContent(null)
      })
      .catch(() => {
        setLoadingContent(null)
      })
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 rounded-lg" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return <EmptyState icon="alertCircle" title="Failed to load rules" description={error} />
  }

  if (rules.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="ruler"
          title="No rules configured"
          description="Rules will appear here when added to .claude/rules/"
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-stroke-primary">
        <span className="text-sm font-semibold text-content-secondary uppercase tracking-wider">
          Rules ({rules.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {rules.map((rule) => (
          <RuleCard
            key={rule.name}
            rule={rule}
            isExpanded={expandedRule === rule.name}
            content={ruleContents.get(rule.name) ?? null}
            loadingContent={loadingContent === rule.name}
            onToggle={() => handleToggle(rule.name)}
          />
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { ExpertDetail } from '../../../lib/api'
import { Icons } from '../../../lib/icons'
import { cn } from '../../../lib/utils'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'

interface ExpertDetailViewProps {
  expert: ExpertDetail
  onBack: () => void
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: React.ReactNode
}

function CollapsibleSection({
  title,
  icon,
  count,
  defaultOpen = false,
  children,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card variant="outlined" padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-white">{title}</span>
          {count !== undefined && (
            <span className="text-xs text-content-muted bg-surface-primary px-1.5 py-0.5 rounded">
              {count}
            </span>
          )}
          {badge}
        </div>
        <Icons.chevronDown
          className={cn(
            'w-4 h-4 text-content-muted transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 pt-1 border-t border-border-subtle">
          {children}
        </div>
      </div>
    </Card>
  )
}

// Enhanced Confidence Bar with visual blocks
function EnhancedConfidenceBar({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const percentage = Math.round(value * 100)
  const blocks = 10
  const filledBlocks = Math.round((percentage / 100) * blocks)

  const getColorClass = (): { filled: string; text: string } => {
    if (percentage >= 80) return { filled: 'bg-green-500', text: 'text-green-400' }
    if (percentage >= 50) return { filled: 'bg-yellow-500', text: 'text-yellow-400' }
    return { filled: 'bg-red-500', text: 'text-red-400' }
  }

  const colors = getColorClass()
  const sizeClasses = {
    sm: { block: 'w-1.5 h-2', text: 'text-[10px]', gap: 'gap-0.5' },
    md: { block: 'w-2 h-3', text: 'text-xs', gap: 'gap-0.5' },
    lg: { block: 'w-3 h-4', text: 'text-sm', gap: 'gap-1' },
  }

  return (
    <div className="flex items-center gap-2">
      <span className={cn('font-mono tabular-nums', colors.text, sizeClasses[size].text)}>
        {percentage}%
      </span>
      <div className={cn('flex', sizeClasses[size].gap)}>
        {Array.from({ length: blocks }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-sm transition-colors',
              sizeClasses[size].block,
              i < filledBlocks ? colors.filled : 'bg-surface-primary'
            )}
          />
        ))}
      </div>
    </div>
  )
}

// Confidence Badge
function ConfidenceBadge({ value }: { value: number }) {
  const percentage = Math.round(value * 100)

  const getStyle = (): string => {
    if (percentage >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (percentage >= 50) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-mono', getStyle())}>
      {percentage}%
    </span>
  )
}

export default function ExpertDetailView({ expert, onBack }: ExpertDetailViewProps) {
  const { expertise, validation } = expert

  // Guard clause for incomplete data
  if (!expertise || !validation) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <Icons.arrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Card variant="outlined" padding="md">
          <p className="text-sm text-content-muted">Expert data unavailable</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button variant="secondary" size="sm" onClick={onBack}>
        <Icons.arrowLeft className="w-4 h-4 mr-1" />
        Back
      </Button>

      {/* Header with Confidence */}
      <ExpertHeader expertise={expertise} />

      {/* Validation Status */}
      <ValidationCard validation={validation} />

      {/* Mental Model Section */}
      <CollapsibleSection
        title="Mental Model"
        icon={<Icons.bookOpen className="w-4 h-4 text-purple-400" />}
        defaultOpen={true}
      >
        <MentalModelContent mentalModel={expertise.mental_model} />
      </CollapsibleSection>

      {/* Patterns Section */}
      <CollapsibleSection
        title="Learned Patterns"
        icon={<Icons.puzzle className="w-4 h-4 text-blue-400" />}
        count={expertise.patterns?.length ?? 0}
      >
        <PatternsContent patterns={expertise.patterns ?? []} />
      </CollapsibleSection>

      {/* Known Issues Section */}
      <CollapsibleSection
        title="Known Issues"
        icon={<Icons.alertTriangle className="w-4 h-4 text-yellow-400" />}
        count={expertise.known_issues?.length ?? 0}
      >
        <IssuesContent issues={expertise.known_issues ?? []} />
      </CollapsibleSection>

      {/* Changelog Section */}
      <CollapsibleSection
        title="Changelog"
        icon={<Icons.clock className="w-4 h-4 text-cyan-400" />}
        count={expertise.changelog?.length ?? 0}
      >
        <ChangelogTimeline changelog={expertise.changelog ?? []} />
      </CollapsibleSection>
    </div>
  )
}

function ExpertHeader({ expertise }: { expertise: ExpertDetail['expertise'] }) {
  const confidence = expertise.confidence ?? 0
  const lastUpdated = expertise.last_updated
    ? new Date(expertise.last_updated).toLocaleDateString()
    : 'Unknown'

  return (
    <Card variant="elevated" padding="md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Icons.cpu className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-white">{expertise.domain ?? 'Unknown Domain'}</h2>
              <span className="text-xs text-content-muted bg-surface-primary px-2 py-0.5 rounded">
                v{expertise.version ?? '0.0.0'}
              </span>
            </div>
            <div className="text-xs text-content-muted mt-0.5">
              Updated: {lastUpdated}
            </div>
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mt-4 pt-3 border-t border-border-subtle">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-content-muted">Confidence</span>
        </div>
        <EnhancedConfidenceBar value={confidence} size="lg" />
      </div>
    </Card>
  )
}

function ValidationCard({ validation }: { validation: ExpertDetail['validation'] }) {
  const errors = validation.errors ?? []
  const warnings = validation.warnings ?? []

  if (validation.valid && errors.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
        <Icons.checkCircle className="w-4 h-4 text-green-400" />
        <span className="text-sm text-green-400">All validations passed</span>
      </div>
    )
  }

  return (
    <Card variant={validation.valid ? 'outlined' : 'elevated'} padding="sm">
      <div className="flex items-center gap-2">
        {validation.valid ? (
          <>
            <Icons.checkCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Validation passed</span>
          </>
        ) : (
          <>
            <Icons.alertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">Validation issues</span>
          </>
        )}
      </div>
      {errors.length > 0 && (
        <ul className="mt-2 text-xs text-red-300 space-y-1">
          {errors.map((e, i) => <li key={i}>- {e}</li>)}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="mt-2 text-xs text-yellow-300 space-y-1">
          {warnings.map((w, i) => <li key={i}>- {w}</li>)}
        </ul>
      )}
    </Card>
  )
}

function MentalModelContent({ mentalModel }: { mentalModel: ExpertDetail['expertise']['mental_model'] | undefined }) {
  if (!mentalModel) {
    return (
      <div className="text-center py-4 text-sm text-content-muted">
        No mental model available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div>
        <h4 className="text-xs font-medium text-content-muted uppercase tracking-wide mb-2">
          Overview
        </h4>
        <p className="text-sm text-content-secondary leading-relaxed">
          {mentalModel.overview ?? 'No overview available'}
        </p>
      </div>

      {/* Key Files */}
      {mentalModel.key_files && mentalModel.key_files.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-content-muted uppercase tracking-wide mb-2">
            Key Files
          </h4>
          <div className="space-y-2">
            {mentalModel.key_files.map((f, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-surface-primary rounded">
                <Icons.file className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <code className="text-xs text-purple-300 break-all">{f.path}</code>
                  <p className="text-xs text-content-muted mt-0.5">{f.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Expandable Pattern Item
function PatternItem({ pattern }: { pattern: { name: string; confidence: number; usage?: string } }) {
  const [expanded, setExpanded] = useState(false)
  const hasUsage = pattern.usage && pattern.usage.trim().length > 0

  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => hasUsage && setExpanded(!expanded)}
        disabled={!hasUsage}
        className={cn(
          'w-full p-3 flex items-center justify-between',
          hasUsage && 'hover:bg-surface-secondary/50 cursor-pointer',
          !hasUsage && 'cursor-default'
        )}
      >
        <div className="flex items-center gap-3">
          <Icons.code className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-white">{pattern.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge value={pattern.confidence} />
          {hasUsage && (
            <Icons.chevronDown
              className={cn(
                'w-4 h-4 text-content-muted transition-transform duration-200',
                expanded && 'rotate-180'
              )}
            />
          )}
        </div>
      </button>

      {hasUsage && expanded && (
        <div className="px-3 pb-3 border-t border-border-subtle bg-surface-primary/50">
          <div className="mt-3">
            <h5 className="text-[10px] uppercase tracking-wide text-content-muted mb-2">
              Usage Example
            </h5>
            <pre className="text-xs text-content-secondary bg-surface-primary p-3 rounded overflow-x-auto">
              <code>{pattern.usage}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function PatternsContent({ patterns }: { patterns: Array<{ name: string; confidence: number; usage?: string }> }) {
  if (patterns.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-content-muted">
        No patterns learned yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {patterns.map((p, i) => (
        <PatternItem key={i} pattern={p} />
      ))}
    </div>
  )
}

// Expandable Issue Item
function IssueItem({ issue }: { issue: { id: string; symptom: string; solution: string; verified: boolean } }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-start justify-between hover:bg-surface-secondary/50"
      >
        <div className="flex items-start gap-3 text-left">
          {issue.verified ? (
            <span className="text-green-400 mt-0.5" title="Verified">
              <Icons.checkCircle className="w-4 h-4" />
            </span>
          ) : (
            <span className="text-yellow-400 mt-0.5" title="Pending verification">
              <Icons.clock className="w-4 h-4" />
            </span>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-content-muted">{issue.id}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded uppercase font-medium',
                issue.verified
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              )}>
                {issue.verified ? 'Verified' : 'Pending'}
              </span>
            </div>
            <p className="text-sm text-content-secondary">{issue.symptom}</p>
          </div>
        </div>
        <Icons.chevronDown
          className={cn(
            'w-4 h-4 text-content-muted transition-transform duration-200 shrink-0 mt-1',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border-subtle bg-surface-primary/50">
          <div className="mt-3">
            <h5 className="text-[10px] uppercase tracking-wide text-content-muted mb-2 flex items-center gap-1">
              <Icons.lightbulb className="w-3 h-3" />
              Solution
            </h5>
            <p className="text-sm text-green-400 bg-green-500/10 p-3 rounded border border-green-500/20">
              {issue.solution}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function IssuesContent({ issues }: { issues: Array<{ id: string; symptom: string; solution: string; verified: boolean }> }) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-content-muted">
        No known issues recorded
      </div>
    )
  }

  const verifiedCount = issues.filter(i => i.verified).length
  const pendingCount = issues.length - verifiedCount

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-content-muted">
        <span className="flex items-center gap-1">
          <Icons.checkCircle className="w-3 h-3 text-green-400" />
          {verifiedCount} verified
        </span>
        <span className="flex items-center gap-1">
          <Icons.clock className="w-3 h-3 text-yellow-400" />
          {pendingCount} pending
        </span>
      </div>

      {/* Issues List */}
      <div className="space-y-2">
        {issues.map((issue, i) => (
          <IssueItem key={i} issue={issue} />
        ))}
      </div>
    </div>
  )
}

// Changelog Entry Types
const changelogTypeConfig: Record<string, { icon: typeof Icons.sparkles; color: string; bg: string }> = {
  'auto-learn': { icon: Icons.sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  'learned': { icon: Icons.sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  'manual': { icon: Icons.pen, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  'bootstrap': { icon: Icons.zap, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  'verified': { icon: Icons.checkCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
  'corrected': { icon: Icons.wrench, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
}

function ChangelogTimeline({ changelog }: { changelog: Array<{ date: string; type: string; change: string }> }) {
  if (changelog.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-content-muted">
        No changes recorded
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3 top-3 bottom-3 w-px bg-border-subtle" />

      <div className="space-y-0">
        {changelog.map((entry, i) => {
          const config = changelogTypeConfig[entry.type] ?? {
            icon: Icons.dot,
            color: 'text-content-muted',
            bg: 'bg-surface-primary',
          }
          const Icon = config.icon

          return (
            <div key={i} className="relative flex items-start gap-3 py-3">
              {/* Timeline dot */}
              <div className={cn(
                'relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                config.bg
              )}>
                <Icon className={cn('w-3 h-3', config.color)} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-content-muted">
                    {formatDate(entry.date)}
                  </span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded uppercase font-medium',
                    config.bg,
                    config.color
                  )}>
                    {entry.type}
                  </span>
                </div>
                <p className="text-sm text-content-secondary mt-1">
                  {entry.change}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper to format dates
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`

    return date.toLocaleDateString()
  } catch {
    return dateStr
  }
}

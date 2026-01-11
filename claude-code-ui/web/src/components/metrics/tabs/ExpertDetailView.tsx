import type { ExpertDetail } from '../../../lib/api'
import { Icons } from '../../../lib/icons'
import { cn } from '../../../lib/utils'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { StatusBadge } from '../../ui/StatusBadge'
import ConfidenceBar from '../ConfidenceBar'

interface ExpertDetailViewProps {
  expert: ExpertDetail
  onBack: () => void
}

export default function ExpertDetailView({ expert, onBack }: ExpertDetailViewProps) {
  const { expertise, validation } = expert

  return (
    <div className="space-y-4">
      <Button variant="secondary" size="sm" onClick={onBack}>
        <Icons.arrowLeft className="w-4 h-4 mr-1" />
        Back
      </Button>

      {/* Header */}
      <ExpertHeader expertise={expertise} />

      {/* Validation Status */}
      <ValidationCard validation={validation} />

      {/* Overview */}
      <Card variant="outlined" padding="md">
        <h3 className="text-sm font-medium text-white mb-2">Overview</h3>
        <p className="text-sm text-content-secondary">{expertise.mental_model.overview}</p>
      </Card>

      {/* Key Files */}
      <KeyFilesCard files={expertise.mental_model.key_files} />

      {/* Patterns */}
      {expertise.patterns && expertise.patterns.length > 0 && (
        <PatternsCard patterns={expertise.patterns} />
      )}

      {/* Known Issues */}
      {expertise.known_issues && expertise.known_issues.length > 0 && (
        <KnownIssuesCard issues={expertise.known_issues} />
      )}

      {/* Changelog */}
      {expertise.changelog && expertise.changelog.length > 0 && (
        <ChangelogCard changelog={expertise.changelog} />
      )}
    </div>
  )
}

function ExpertHeader({ expertise }: { expertise: ExpertDetail['expertise'] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
        <Icons.cpu className="w-6 h-6 text-purple-400" />
      </div>
      <div>
        <h2 className="text-lg font-medium text-white">{expertise.domain}</h2>
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <span>v{expertise.version}</span>
          <span>|</span>
          <span>Updated: {new Date(expertise.last_updated).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}

function ValidationCard({ validation }: { validation: ExpertDetail['validation'] }) {
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
      {validation.errors.length > 0 && (
        <ul className="mt-2 text-xs text-red-300 space-y-1">
          {validation.errors.map((e, i) => <li key={i}>- {e}</li>)}
        </ul>
      )}
      {validation.warnings.length > 0 && (
        <ul className="mt-2 text-xs text-yellow-300 space-y-1">
          {validation.warnings.map((w, i) => <li key={i}>- {w}</li>)}
        </ul>
      )}
    </Card>
  )
}

function KeyFilesCard({ files }: { files: Array<{ path: string; purpose: string }> }) {
  return (
    <Card variant="outlined" padding="md">
      <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
        <Icons.file className="w-4 h-4" />
        Key Files ({files.length})
      </h3>
      <div className="space-y-2">
        {files.map((f, i) => (
          <div key={i} className="text-sm">
            <code className="text-purple-300 text-xs">{f.path}</code>
            <p className="text-content-muted text-xs">{f.purpose}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function PatternsCard({ patterns }: { patterns: Array<{ name: string; confidence: number }> }) {
  return (
    <Card variant="outlined" padding="md">
      <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
        <Icons.puzzle className="w-4 h-4" />
        Patterns ({patterns.length})
      </h3>
      <div className="space-y-2">
        {patterns.map((p, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm text-content-secondary">{p.name}</span>
            <ConfidenceBar value={p.confidence} size="sm" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function KnownIssuesCard({ issues }: { issues: Array<{ id: string; symptom: string; solution: string; verified: boolean }> }) {
  return (
    <Card variant="outlined" padding="md">
      <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
        <Icons.alertTriangle className="w-4 h-4 text-yellow-400" />
        Known Issues ({issues.length})
      </h3>
      <div className="space-y-2">
        {issues.map((issue, i) => (
          <div key={i} className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-content-muted">{issue.id}</span>
              {issue.verified && <StatusBadge status="success" size="sm" />}
            </div>
            <p className="text-content-secondary">{issue.symptom}</p>
            <p className="text-xs text-green-400 mt-1">{issue.solution}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ChangelogCard({ changelog }: { changelog: Array<{ date: string; type: string; change: string }> }) {
  return (
    <Card variant="outlined" padding="md">
      <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
        <Icons.clock className="w-4 h-4" />
        Recent Changes
      </h3>
      <div className="space-y-2">
        {changelog.slice(0, 5).map((entry, i) => (
          <div key={i} className="text-xs flex items-start gap-2">
            <span className="text-content-muted">{entry.date}</span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] uppercase',
              entry.type === 'learned' && 'bg-purple-500/20 text-purple-300',
              entry.type === 'verified' && 'bg-green-500/20 text-green-300',
              entry.type === 'corrected' && 'bg-yellow-500/20 text-yellow-300'
            )}>
              {entry.type}
            </span>
            <span className="text-content-secondary">{entry.change}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

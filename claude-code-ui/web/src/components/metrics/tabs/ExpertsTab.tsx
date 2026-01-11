import type { ExpertInfo, ExpertDetail } from '../../../lib/api'
import { Icons } from '../../../lib/icons'
import { Card, EmptyState } from '../../ui'
import ConfidenceBar from '../ConfidenceBar'
import ExpertDetailView from './ExpertDetailView'

interface ExpertsTabProps {
  experts: ExpertInfo[]
  selectedExpert: ExpertDetail | null
  onSelectExpert: (id: string) => void
  onBack: () => void
}

export default function ExpertsTab({
  experts,
  selectedExpert,
  onSelectExpert,
  onBack,
}: ExpertsTabProps) {
  if (selectedExpert) {
    return <ExpertDetailView expert={selectedExpert} onBack={onBack} />
  }

  if (experts.length === 0) {
    return (
      <EmptyState
        icon="brain"
        title="No experts configured"
        description="Add expertise files to .claude/experts/"
        variant="compact"
      />
    )
  }

  return (
    <div className="space-y-3">
      {experts.map(expert => (
        <Card
          key={expert.id}
          variant="outlined"
          padding="md"
          className="cursor-pointer hover:border-purple-500/50 transition-colors"
          onClick={() => onSelectExpert(expert.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Icons.cpu className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-white">{expert.domain}</div>
                <div className="text-xs text-content-muted">ID: {expert.id}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ConfidenceBar value={expert.confidence} showLabel />
              <Icons.chevronRight className="w-4 h-4 text-content-muted" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

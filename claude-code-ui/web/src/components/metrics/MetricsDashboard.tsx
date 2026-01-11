import { Icons } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { IconButton, Skeleton } from '../ui'
import { StatusDot } from '../ui/StatusBadge'
import { useMetricsDashboard, type DashboardTab } from '../../hooks/useMetricsDashboard'
import { OverviewTab, ExpertsTab, LearningTab } from './tabs'

interface Props {
  onClose?: () => void
}

const TABS: DashboardTab[] = ['overview', 'experts', 'learning']

export default function MetricsDashboard({ onClose }: Props) {
  const {
    stats,
    experts,
    selectedExpert,
    autoLearnEnabled,
    loading,
    activeTab,
    autoRefresh,
    setActiveTab,
    setAutoRefresh,
    toggleAutoLearn,
    selectExpert,
    clearSelectedExpert,
    avgExpertConfidence,
  } = useMetricsDashboard()

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="h-full flex flex-col bg-surface-tertiary border-l border-stroke-primary">
      <Header
        autoRefresh={autoRefresh}
        onToggleRefresh={() => setAutoRefresh(!autoRefresh)}
        onClose={onClose}
      />

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto p-4">
        <div key={activeTab} className="animate-slide-up">
          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats}
              experts={experts}
              avgConfidence={avgExpertConfidence}
            />
          )}
          {activeTab === 'experts' && (
            <ExpertsTab
              experts={experts}
              selectedExpert={selectedExpert}
              onSelectExpert={selectExpert}
              onBack={clearSelectedExpert}
            />
          )}
          {activeTab === 'learning' && (
            <LearningTab
              stats={stats}
              autoLearnEnabled={autoLearnEnabled}
              onToggleAutoLearn={toggleAutoLearn}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="h-full flex flex-col bg-surface-tertiary border-l border-stroke-primary">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-stroke-primary">
        <Icons.barChart className="w-5 h-5 text-purple-400 animate-pulse" />
        <span className="text-lg font-medium text-white">Metrics</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  )
}

function Header({
  autoRefresh,
  onToggleRefresh,
  onClose,
}: {
  autoRefresh: boolean
  onToggleRefresh: () => void
  onClose?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-stroke-primary">
      <div className="flex items-center gap-2">
        <Icons.barChart className="w-5 h-5 text-purple-400" />
        <span className="text-lg font-medium text-white">Metrics</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleRefresh}
          className={cn(
            'px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors',
            autoRefresh
              ? 'bg-green-600/20 text-green-400'
              : 'bg-surface-primary text-content-muted'
          )}
        >
          <StatusDot
            status={autoRefresh ? 'success' : 'pending'}
            size="sm"
            pulse={autoRefresh}
          />
          {autoRefresh ? 'Live' : 'Paused'}
        </button>
        {onClose && (
          <IconButton label="Close" onClick={onClose}>
            <Icons.x className="w-4 h-4" />
          </IconButton>
        )}
      </div>
    </div>
  )
}

function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
}) {
  return (
    <div className="flex border-b border-stroke-primary">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === tab
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-content-muted hover:text-white'
          )}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  )
}

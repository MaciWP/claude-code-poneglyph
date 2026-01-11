import { Icons } from '../lib/icons'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { STORAGE_KEYS } from '../types/preferences'
import { MetricsDashboard } from './metrics'

export default function RightPanel() {
  const [isCollapsed, setIsCollapsed] = useLocalStorage(STORAGE_KEYS.RIGHT_PANEL_COLLAPSED || 'right-panel-collapsed', false)

  if (isCollapsed) {
    return (
      <div className="w-12 border-l border-stroke-primary bg-surface-secondary flex flex-col">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-3 text-content-muted hover:text-white transition-colors"
          title="Expand metrics panel"
        >
          <Icons.panelRight className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col items-center py-2">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 rounded-lg bg-purple-500/20 text-purple-400"
            title="Metrics"
          >
            <Icons.barChart className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-l border-stroke-primary bg-surface-secondary flex flex-col">
      <div className="flex items-center justify-between border-b border-stroke-primary px-3 py-2.5">
        <div className="flex items-center gap-2 text-purple-400">
          <Icons.barChart className="w-4 h-4" />
          <span className="text-sm font-medium">Metrics</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 text-content-muted hover:text-white transition-colors rounded hover:bg-surface-hover"
          title="Collapse panel"
        >
          <Icons.panelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <MetricsDashboard />
      </div>
    </div>
  )
}

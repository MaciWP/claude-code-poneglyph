import { useState } from 'react'
import { cn } from '../../lib/utils'
import { AgentsManager } from './AgentsManager'
import { HooksMonitor } from './HooksMonitor'
import { RulesViewer } from './RulesViewer'
import { CommandsBrowser } from './CommandsBrowser'

type ConfigTab = 'agents' | 'hooks' | 'rules' | 'commands'

const CONFIG_TABS: { key: ConfigTab; label: string }[] = [
  { key: 'agents', label: 'Agents' },
  { key: 'hooks', label: 'Hooks' },
  { key: 'rules', label: 'Rules' },
  { key: 'commands', label: 'Commands' },
]

const TAB_COMPONENTS: Record<ConfigTab, React.FC> = {
  agents: AgentsManager,
  hooks: HooksMonitor,
  rules: RulesViewer,
  commands: CommandsBrowser,
}

export function ConfigCenter(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ConfigTab>('agents')

  const ActiveComponent = TAB_COMPONENTS[activeTab]

  return (
    <div className="flex flex-col h-full bg-surface-primary">
      <div className="flex overflow-x-auto border-b border-stroke-primary bg-surface-tertiary">
        {CONFIG_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
              activeTab === tab.key
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-content-muted hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <div key={activeTab} className="h-full animate-fade-in">
          <ActiveComponent />
        </div>
      </div>
    </div>
  )
}

export { AgentsManager } from './AgentsManager'
export { HooksMonitor } from './HooksMonitor'
export { RulesViewer } from './RulesViewer'
export { CommandsBrowser } from './CommandsBrowser'

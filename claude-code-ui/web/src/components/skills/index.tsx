import { useState } from 'react'
import { cn } from '../../lib/utils'
import { SkillBrowser } from './SkillBrowser'
import { SkillEditor } from './SkillEditor'
import { EvalRunner } from './EvalRunner'
import { SkillAnalytics } from './SkillAnalytics'

type DetailTab = 'editor' | 'eval' | 'analytics'

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'editor', label: 'Editor' },
  { key: 'eval', label: 'Eval' },
  { key: 'analytics', label: 'Analytics' },
]

export function SkillsIDE(): React.ReactElement {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('analytics')

  const handleSelectSkill = (name: string): void => {
    setSelectedSkill(name)
    if (detailTab === 'analytics') {
      setDetailTab('editor')
    }
  }

  const handleBack = (): void => {
    setSelectedSkill(null)
    setDetailTab('analytics')
  }

  return (
    <div className="flex h-full bg-surface-primary">
      <div className="w-72 flex-shrink-0 border-r border-stroke-primary bg-surface-tertiary overflow-hidden">
        <SkillBrowser onSelectSkill={handleSelectSkill} selectedSkill={selectedSkill} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex overflow-x-auto border-b border-stroke-primary bg-surface-tertiary">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setDetailTab(tab.key)}
              className={cn(
                'flex-1 shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                detailTab === tab.key
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-content-muted hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          <div key={detailTab} className="h-full animate-fade-in">
            {detailTab === 'editor' && (
              <SkillEditor skillName={selectedSkill} onBack={handleBack} />
            )}
            {detailTab === 'eval' && <EvalRunner skillName={selectedSkill} />}
            {detailTab === 'analytics' && <SkillAnalytics />}
          </div>
        </div>
      </div>
    </div>
  )
}

export { SkillBrowser } from './SkillBrowser'
export { SkillEditor } from './SkillEditor'
export { EvalRunner } from './EvalRunner'
export { SkillAnalytics } from './SkillAnalytics'

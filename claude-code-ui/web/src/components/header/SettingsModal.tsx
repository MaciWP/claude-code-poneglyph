import { Icons } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { IconButton, Switch } from '../ui'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  workDir: string
  onWorkDirChange: (dir: string) => void
  allowFullPC: boolean
  onAllowFullPCChange: (allow: boolean) => void
}

export function SettingsModal({
  isOpen,
  onClose,
  workDir,
  onWorkDirChange,
  allowFullPC,
  onAllowFullPCChange,
}: SettingsModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface-tertiary border border-stroke-primary rounded-xl shadow-elevated w-full max-w-md overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stroke-primary">
          <div className="flex items-center gap-2">
            <Icons.settings className="w-5 h-5 text-content-muted" />
            <h2 className="text-lg font-semibold text-white">Settings</h2>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <Icons.x className="w-5 h-5" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Working Directory */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
              <Icons.folder className="w-4 h-4 text-content-muted" />
              Working Directory
            </label>
            <input
              type="text"
              value={workDir}
              onChange={e => onWorkDirChange(e.target.value)}
              placeholder="e.g. D:\Projects\my-app"
              className={cn(
                'w-full bg-surface-input border border-stroke-primary text-content-secondary',
                'text-sm rounded-lg px-3 py-2',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'transition-colors placeholder:text-content-dimmed'
              )}
            />
            <p className="text-xs text-content-muted">
              Default directory for file operations
            </p>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-content-secondary">
              <Icons.wrench className="w-4 h-4 text-content-muted" />
              Permissions
            </h3>

            <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg border border-stroke-primary">
              <div>
                <div className="text-sm text-content-secondary">Full PC Access</div>
                <div className="text-xs text-content-muted">
                  Allow operations outside working directory
                </div>
              </div>
              <Switch
                checked={allowFullPC}
                onChange={onAllowFullPCChange}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-stroke-primary bg-surface-secondary">
          <button
            onClick={onClose}
            className={cn(
              'w-full px-4 py-2 rounded-lg text-sm font-medium',
              'bg-blue-600 hover:bg-blue-700 text-white',
              'transition-colors'
            )}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

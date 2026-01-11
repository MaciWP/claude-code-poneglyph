import { useState, useRef, useEffect } from 'react'
import type { ModelProvider } from '../../lib/api'
import { Icons } from '../../lib/icons'
import { cn } from '../../lib/utils'

interface ProviderSelectorProps {
  value: ModelProvider
  onChange: (provider: ModelProvider) => void
}

const PROVIDERS: Array<{ id: ModelProvider; label: string; color: string }> = [
  { id: 'claude', label: 'Claude', color: 'bg-purple-500' },
  { id: 'codex', label: 'Codex', color: 'bg-blue-500' },
  { id: 'gemini', label: 'Gemini', color: 'bg-emerald-500' },
]

export function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const current = PROVIDERS.find(p => p.id === value) || PROVIDERS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-surface-secondary border border-stroke-primary',
          'hover:bg-surface-hover hover:border-stroke-secondary',
          'transition-all duration-150',
          'text-sm font-medium text-content-secondary'
        )}
      >
        <span className={cn('w-2 h-2 rounded-full', current.color)} />
        <span>{current.label}</span>
        <Icons.chevronDown className={cn(
          'w-3.5 h-3.5 text-content-muted transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[120px] bg-surface-tertiary border border-stroke-primary rounded-lg shadow-elevated overflow-hidden animate-slide-down z-50">
          {PROVIDERS.map(provider => (
            <button
              key={provider.id}
              onClick={() => {
                onChange(provider.id)
                setIsOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm',
                'hover:bg-surface-hover transition-colors',
                provider.id === value ? 'text-white' : 'text-content-secondary'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full', provider.color)} />
              <span>{provider.label}</span>
              {provider.id === value && (
                <Icons.check className="w-3.5 h-3.5 ml-auto text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

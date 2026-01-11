/**
 * ContextWindowIndicator - Visual indicator for context window usage
 *
 * Circular progress indicator with color-coded status and tooltip.
 */

import { memo, useState } from 'react'
import type { ContextWindowState } from '../hooks/useContextWindow'

interface Props {
  state: ContextWindowState
  isCompacting?: boolean
  compactionSaved?: number | null
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

const SIZE_CONFIG = {
  sm: { size: 24, strokeWidth: 3, fontSize: 'text-[8px]' },
  md: { size: 32, strokeWidth: 4, fontSize: 'text-[10px]' },
  lg: { size: 40, strokeWidth: 5, fontSize: 'text-xs' },
}

const STATUS_COLORS = {
  safe: {
    stroke: 'stroke-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    label: 'Safe',
  },
  warning: {
    stroke: 'stroke-yellow-500',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    label: 'Warning',
  },
  critical: {
    stroke: 'stroke-red-500',
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    label: 'Critical',
  },
  compacting: {
    stroke: 'stroke-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    label: 'Compacting',
  },
}

export default memo(function ContextWindowIndicator({
  state,
  isCompacting = false,
  compactionSaved,
  size = 'sm',
  showTooltip = true,
}: Props) {
  const [isHovered, setIsHovered] = useState(false)

  const config = SIZE_CONFIG[size]
  const status = isCompacting ? 'compacting' : state.status
  const colors = STATUS_COLORS[status]

  const radius = (config.size - config.strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(state.percentage, 1)
  const strokeDashoffset = circumference * (1 - progress)

  const percentage = (state.percentage * 100).toFixed(0)
  const usedK = (state.usedTokens / 1000).toFixed(0)
  const maxK = (state.maxTokens / 1000).toFixed(0)

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative rounded-full ${colors.bg} p-0.5`}>
        <svg
          width={config.size}
          height={config.size}
          className={`transform -rotate-90 ${isCompacting ? 'animate-pulse' : ''}`}
        >
          {/* Background circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            className="stroke-content-dimmed/20"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            className={`${colors.stroke} transition-all duration-300`}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Center text */}
        <div
          className={`absolute inset-0 flex items-center justify-center ${config.fontSize} font-medium ${colors.text}`}
        >
          {percentage}%
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-surface-overlay border border-stroke-primary rounded-lg shadow-lg p-3 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${colors.stroke.replace('stroke-', 'bg-')}`} />
              <span className={`font-medium ${colors.text}`}>{colors.label}</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-content-muted">Used:</span>
                <span className="text-content-primary">{usedK}K / {maxK}K tokens</span>
              </div>

              <div className="flex justify-between">
                <span className="text-content-muted">Remaining:</span>
                <span className="text-content-primary">
                  {((1 - state.percentage) * 100).toFixed(0)}%
                </span>
              </div>

              {state.breakdown && (
                <>
                  <div className="border-t border-stroke-secondary my-2" />
                  <div className="text-content-muted mb-1">Breakdown:</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span className="text-content-dimmed">System:</span>
                    <span className="text-right">{(state.breakdown.system / 1000).toFixed(1)}K</span>
                    <span className="text-content-dimmed">History:</span>
                    <span className="text-right">{(state.breakdown.history / 1000).toFixed(1)}K</span>
                    <span className="text-content-dimmed">Tools:</span>
                    <span className="text-right">{(state.breakdown.tools / 1000).toFixed(1)}K</span>
                    <span className="text-content-dimmed">Current:</span>
                    <span className="text-right">{(state.breakdown.current / 1000).toFixed(1)}K</span>
                  </div>
                </>
              )}

              {compactionSaved != null && compactionSaved > 0 && (
                <div className="text-green-500 text-center mt-2">
                  Saved {(compactionSaved / 1000).toFixed(1)}K tokens
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-8 border-transparent border-t-surface-overlay" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

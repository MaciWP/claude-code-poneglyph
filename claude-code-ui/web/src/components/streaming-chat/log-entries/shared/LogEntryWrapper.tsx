import type { ReactNode } from 'react'

type BorderColor = 'green' | 'orange' | 'amber' | 'blue' | 'purple' | 'red' | 'yellow' | 'none'
type BackgroundColor = 'green' | 'amber' | 'yellow' | 'teal' | 'none'

interface LogEntryWrapperProps {
  children: ReactNode
  borderColor?: BorderColor
  backgroundColor?: BackgroundColor
  className?: string
  indented?: boolean
}

const borderColorClasses: Record<BorderColor, string> = {
  green: 'border-l-4 border-green-500 pl-3',
  orange: 'ml-4 border-l-2 border-orange-500/30 pl-3',
  amber: 'border-l-4 border-amber-500/30 pl-3',
  blue: 'border-l-4 border-blue-500 pl-3',
  purple: 'border-l-4 border-purple-500 pl-3',
  red: 'border-l-4 border-red-500 pl-3',
  yellow: 'border-l-4 border-yellow-500/30 pl-3',
  none: '',
}

const backgroundColorClasses: Record<BackgroundColor, string> = {
  green: 'bg-green-900/10',
  amber: 'bg-amber-900/10',
  yellow: 'bg-yellow-900/10',
  teal: 'bg-teal-900/10',
  none: '',
}

export default function LogEntryWrapper({
  children,
  borderColor = 'none',
  backgroundColor = 'none',
  className = '',
  indented = false,
}: LogEntryWrapperProps) {
  const baseClasses = 'py-2 border-b border-surface-tertiary last:border-0 group'
  const borderClasses = borderColorClasses[borderColor]
  const bgClasses = backgroundColorClasses[backgroundColor]
  const indentClasses = indented ? 'ml-4' : ''

  return (
    <div className={`${baseClasses} ${borderClasses} ${bgClasses} ${indentClasses} ${className}`.trim()}>
      {children}
    </div>
  )
}

import { Icons } from '../../../../lib/icons'

interface ExpandCollapseButtonProps {
  expanded: boolean
  onClick: () => void
  label?: string
  className?: string
}

export default function ExpandCollapseButton({
  expanded,
  onClick,
  label,
  className = '',
}: ExpandCollapseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1 transition-colors ${className}`}
    >
      {expanded ? (
        <Icons.chevronDown className="w-3 h-3" />
      ) : (
        <Icons.chevronRight className="w-3 h-3" />
      )}
      {label && <span>{label}</span>}
    </button>
  )
}

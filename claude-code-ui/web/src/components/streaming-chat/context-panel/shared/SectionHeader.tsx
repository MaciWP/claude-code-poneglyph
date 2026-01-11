import { Icons, type IconName } from '../../../../lib/icons'

interface SectionHeaderProps {
  icon: IconName
  title: string
  count?: number
  collapsible?: boolean
  expanded?: boolean
  onToggle?: () => void
}

export default function SectionHeader({
  icon,
  title,
  count,
  collapsible = true,
  expanded = true,
  onToggle,
}: SectionHeaderProps) {
  const IconComponent = Icons[icon]

  return (
    <button
      onClick={onToggle}
      disabled={!collapsible}
      className={`flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase mb-2 w-full ${
        collapsible ? 'hover:text-gray-400 cursor-pointer' : ''
      }`}
    >
      <IconComponent className="w-3.5 h-3.5" />
      <span>{title}</span>
      {count !== undefined && <span className="text-gray-600">({count})</span>}
      {collapsible && (
        <span className="ml-auto text-gray-600">
          {expanded ? (
            <Icons.chevronDown className="w-3 h-3" />
          ) : (
            <Icons.chevronRight className="w-3 h-3" />
          )}
        </span>
      )}
    </button>
  )
}

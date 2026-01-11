import { Icons } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Card } from '../ui/Card'

type MetricColor = 'purple' | 'blue' | 'green' | 'emerald' | 'orange' | 'red'

interface MetricCardProps {
  icon: keyof typeof Icons
  label: string
  value: string | number
  color: MetricColor
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
}

const colorClasses: Record<MetricColor, string> = {
  purple: 'bg-purple-500/20 text-purple-400',
  blue: 'bg-blue-500/20 text-blue-400',
  green: 'bg-green-500/20 text-green-400',
  emerald: 'bg-emerald-500/20 text-emerald-400',
  orange: 'bg-orange-500/20 text-orange-400',
  red: 'bg-red-500/20 text-red-400',
}

export default function MetricCard({
  icon,
  label,
  value,
  color,
  trend,
}: MetricCardProps) {
  const IconComponent = Icons[icon]

  return (
    <Card variant="outlined" padding="md" className="hover:border-purple-500/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClasses[color])}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{value}</span>
            {trend && (
              <span className={cn(
                'text-xs flex items-center',
                trend.direction === 'up' ? 'text-green-400' : 'text-red-400'
              )}>
                {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          <div className="text-xs text-content-muted">{label}</div>
        </div>
      </div>
    </Card>
  )
}

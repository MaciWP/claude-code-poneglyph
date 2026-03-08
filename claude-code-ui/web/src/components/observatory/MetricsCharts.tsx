import {
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import type { ExecutionTrace } from '@shared/types'
import { EmptyState } from '../ui/EmptyState'

const CHART_COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  amber: '#F59E0B',
  red: '#EF4444',
}

const AGENT_TYPE_COLORS: Record<string, string> = {
  builder: CHART_COLORS.blue,
  scout: CHART_COLORS.green,
  reviewer: CHART_COLORS.purple,
  planner: CHART_COLORS.amber,
  'error-analyzer': CHART_COLORS.red,
}

const PIE_FALLBACK_COLORS = [
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.purple,
  CHART_COLORS.amber,
  CHART_COLORS.red,
]

interface TokenDataPoint {
  label: string
  tokens: number
}

interface CostDataPoint {
  label: string
  cost: number
}

interface AgentWorkloadPoint {
  name: string
  count: number
}

interface ComplexityBucket {
  range: string
  count: number
}

function buildTokenData(traces: ExecutionTrace[]): TokenDataPoint[] {
  return traces
    .slice()
    .reverse()
    .map((t) => ({
      label: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tokens: t.totalTokens,
    }))
}

function buildCostData(traces: ExecutionTrace[]): CostDataPoint[] {
  return traces
    .slice()
    .reverse()
    .map((t) => ({
      label: t.prompt.length > 20 ? `${t.prompt.slice(0, 20)}...` : t.prompt,
      cost: t.totalCostUsd,
    }))
}

function buildAgentWorkload(traces: ExecutionTrace[]): AgentWorkloadPoint[] {
  const counts: Record<string, number> = {}
  for (const trace of traces) {
    for (const agent of trace.agents) {
      counts[agent.type] = (counts[agent.type] ?? 0) + 1
    }
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count }))
}

function buildComplexityDistribution(traces: ExecutionTrace[]): ComplexityBucket[] {
  const buckets: ComplexityBucket[] = [
    { range: '0-20', count: 0 },
    { range: '20-40', count: 0 },
    { range: '40-60', count: 0 },
    { range: '60-80', count: 0 },
    { range: '80-100', count: 0 },
  ]

  for (const trace of traces) {
    const score = trace.complexityScore
    if (score < 20) buckets[0].count++
    else if (score < 40) buckets[1].count++
    else if (score < 60) buckets[2].count++
    else if (score < 80) buckets[3].count++
    else buckets[4].count++
  }

  return buckets
}

function ChartCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-stroke-primary bg-surface-secondary p-4">
      <h3 className="text-sm font-medium text-content-secondary mb-3">{title}</h3>
      {children}
    </div>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#e0e0e0',
  },
}

interface MetricsChartsProps {
  traces: ExecutionTrace[]
}

export function MetricsCharts({ traces }: MetricsChartsProps): React.ReactElement {
  if (traces.length === 0) {
    return (
      <EmptyState
        icon="chart"
        title="No metrics data"
        description="Execute some prompts to generate metrics."
        variant="compact"
      />
    )
  }

  const tokenData = buildTokenData(traces)
  const costData = buildCostData(traces)
  const agentWorkload = buildAgentWorkload(traces)
  const complexityData = buildComplexityDistribution(traces)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ChartCard title="Token Usage Over Time">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={tokenData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis tick={{ fontSize: 10, fill: '#888' }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Line
              type="monotone"
              dataKey="tokens"
              stroke={CHART_COLORS.purple}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.purple, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cost Per Session">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} angle={-20} />
            <YAxis
              tick={{ fontSize: 10, fill: '#888' }}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Cost']}
            />
            <Bar dataKey="cost" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Agent Workload">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={agentWorkload}
              cx="50%"
              cy="50%"
              outerRadius={70}
              dataKey="count"
              nameKey="name"
              label={(props: PieLabelRenderProps) =>
                `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {agentWorkload.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={
                    AGENT_TYPE_COLORS[entry.name] ??
                    PIE_FALLBACK_COLORS[index % PIE_FALLBACK_COLORS.length]
                  }
                />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Complexity Distribution">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={complexityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
            <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis tick={{ fontSize: 10, fill: '#888' }} allowDecimals={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

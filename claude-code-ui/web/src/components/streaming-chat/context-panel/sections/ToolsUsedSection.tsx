import { useState } from 'react'
import type { ToolsUsedSummary, AgentUsage } from '../../../../types/chat'
import { Icons, type IconName } from '../../../../lib/icons'
import { getModelBadge } from '../../../../lib/utils'
import { SectionHeader } from '../shared'

interface Props {
  tools: ToolsUsedSummary
}

export default function ToolsUsedSection({ tools }: Props) {
  const [expanded, setExpanded] = useState(true)

  if (tools.total === 0) {
    return (
      <div className="p-3 border-b border-stroke-primary">
        <SectionHeader
          icon="settings"
          title="TOOLS USED"
          count={0}
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        />
        {expanded && <div className="text-[11px] text-gray-600">No tools used yet</div>}
      </div>
    )
  }

  const fileOpsTotal = Object.values(tools.fileOps).reduce((a, b) => a + b, 0)
  const execTotal = Object.values(tools.execution).reduce((a, b) => a + b, 0)
  const planTotal = Object.values(tools.planning).reduce((a, b) => a + b, 0)
  const navTotal = Object.values(tools.navigation).reduce((a, b) => a + b, 0)

  return (
    <div className="p-3 border-b border-stroke-primary">
      <SectionHeader
        icon="settings"
        title="TOOLS USED"
        count={tools.total}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />

      {expanded && (
        <div className="space-y-2">
          {fileOpsTotal > 0 && (
            <ToolCategoryRow
              icon="folder"
              name="File Ops"
              items={[
                tools.fileOps.read > 0 && { name: 'Read', count: tools.fileOps.read, color: 'text-emerald-400' },
                tools.fileOps.write > 0 && { name: 'Write', count: tools.fileOps.write, color: 'text-amber-400' },
                tools.fileOps.edit > 0 && { name: 'Edit', count: tools.fileOps.edit, color: 'text-amber-400' },
                tools.fileOps.glob > 0 && { name: 'Glob', count: tools.fileOps.glob, color: 'text-emerald-400' },
                tools.fileOps.grep > 0 && { name: 'Grep', count: tools.fileOps.grep, color: 'text-emerald-400' },
              ].filter(Boolean) as ToolItem[]}
            />
          )}

          {execTotal > 0 && (
            <ToolCategoryRow
              icon="terminal"
              name="Execution"
              items={[
                tools.execution.bash > 0 && { name: 'Bash', count: tools.execution.bash, color: 'text-blue-400' },
                tools.execution.skill > 0 && { name: 'Skill', count: tools.execution.skill, color: 'text-purple-400' },
                tools.execution.killShell > 0 && { name: 'Kill', count: tools.execution.killShell, color: 'text-red-400' },
              ].filter(Boolean) as ToolItem[]}
            />
          )}

          {tools.agents.length > 0 && <AgentsCategoryRow agents={tools.agents} />}

          {tools.mcps.length > 0 && <McpsCategoryRow mcps={tools.mcps} />}

          {planTotal > 0 && (
            <ToolCategoryRow
              icon="ruler"
              name="Planning"
              items={[
                tools.planning.todoWrite > 0 && { name: 'Todo', count: tools.planning.todoWrite, color: 'text-cyan-400' },
                tools.planning.planMode > 0 && { name: 'Plan', count: tools.planning.planMode, color: 'text-cyan-400' },
                tools.planning.askUser > 0 && { name: 'Ask', count: tools.planning.askUser, color: 'text-yellow-400' },
              ].filter(Boolean) as ToolItem[]}
            />
          )}

          {navTotal > 0 && (
            <ToolCategoryRow
              icon="compass"
              name="Navigation"
              items={[
                tools.navigation.lsp > 0 && { name: 'LSP', count: tools.navigation.lsp, color: 'text-teal-400' },
                tools.navigation.webFetch > 0 && { name: 'Fetch', count: tools.navigation.webFetch, color: 'text-teal-400' },
                tools.navigation.webSearch > 0 && { name: 'Search', count: tools.navigation.webSearch, color: 'text-teal-400' },
              ].filter(Boolean) as ToolItem[]}
            />
          )}
        </div>
      )}
    </div>
  )
}

interface ToolItem {
  name: string
  count: number
  color: string
}

function ToolCategoryRow({
  icon,
  name,
  items,
}: {
  icon: IconName
  name: string
  items: ToolItem[]
}) {
  const total = items.reduce((a, b) => a + b.count, 0)
  const IconComponent = Icons[icon]

  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center gap-1 text-[11px] text-gray-500 w-20 flex-shrink-0">
        <IconComponent className="w-3 h-3" />
        <span>{name}</span>
        <span className="text-gray-600">({total})</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map(item => (
          <span
            key={item.name}
            className={`text-[11px] px-1.5 py-0.5 rounded bg-surface-tertiary ${item.color}`}
          >
            {item.name} <span className="text-gray-500">{item.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function AgentsCategoryRow({ agents }: { agents: AgentUsage[] }) {
  const total = agents.reduce((a, b) => a + b.count, 0)

  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center gap-1 text-[11px] text-gray-500 w-20 flex-shrink-0">
        <Icons.bot className="w-3 h-3" />
        <span>Agents</span>
        <span className="text-gray-600">({total})</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {agents.map(agent => {
          const badge = getModelBadge(agent.model)
          const statusColor =
            agent.status === 'running'
              ? 'text-orange-400'
              : agent.status === 'failed'
              ? 'text-red-400'
              : 'text-green-400'

          return (
            <span
              key={agent.name}
              className={`text-[11px] px-1.5 py-0.5 rounded bg-surface-tertiary flex items-center gap-1 ${statusColor}`}
            >
              {badge && (
                <span
                  className={`${badge.color} text-white text-[11px] px-1 rounded font-bold`}
                  title={agent.model}
                >
                  {badge.text}
                </span>
              )}
              {agent.name}
              {agent.count > 1 && <span className="text-gray-500">{agent.count}</span>}
              {agent.status === 'running' ? (
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              ) : agent.status === 'failed' ? (
                <Icons.x className="w-3 h-3" />
              ) : (
                <Icons.check className="w-3 h-3" />
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function McpsCategoryRow({
  mcps,
}: {
  mcps: Array<{ server: string; tools: string[]; count: number }>
}) {
  const total = mcps.reduce((a, b) => a + b.count, 0)

  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center gap-1 text-[11px] text-gray-500 w-20 flex-shrink-0">
        <Icons.plug className="w-3 h-3" />
        <span>MCP</span>
        <span className="text-gray-600">({total})</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {mcps.map(mcp => (
          <span
            key={mcp.server}
            className="text-[11px] px-1.5 py-0.5 rounded bg-surface-tertiary text-pink-400"
          >
            {mcp.server}
            {mcp.tools.length > 1 && <span className="text-gray-500 ml-1">({mcp.tools.length} tools)</span>}
            {mcp.count > 1 && <span className="text-gray-500 ml-1">{mcp.count}</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

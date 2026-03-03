import type { BlueprintNode, BlueprintNodeType } from '@shared/types/blueprint'
import { stripQuotes, parseYamlArray, parseOptionalInt } from './blueprint-parser-utils'

const PROP_RE = /^-\s+(\w+)\s*:\s*(.+)$/
const NODE_HEADER_RE = /###\s+Node:\s+(\S+)/g
const VALID_NODE_TYPES = new Set<string>(['agent', 'command', 'gate'])

function mapGetOrEmpty(m: Map<string, string>, key: string): string {
  const val = m.get(key)
  if (val !== undefined) return val
  return ''
}

export function extractNodeSections(body: string): Array<{ id: string; content: string }> {
  const positions: Array<{ id: string; start: number }> = []
  let match: RegExpExecArray | null
  while ((match = NODE_HEADER_RE.exec(body)) !== null) {
    positions.push({ id: match[1], start: match.index })
  }
  return positions.map((pos, i) => {
    const nextPos = positions[i + 1]
    const end = nextPos ? nextPos.start : body.length
    return { id: pos.id, content: body.slice(pos.start, end) }
  })
}

function extractNodeProps(content: string): Map<string, string> {
  const props = new Map<string, string>()
  for (const line of content.split('\n')) {
    const m = line.match(PROP_RE)
    if (m) props.set(m[1], m[2].trim())
  }
  return props
}

function stripQuotesFromProp(props: Map<string, string>, key: string): string | undefined {
  const val = props.get(key)
  if (val === undefined) return undefined
  return stripQuotes(val)
}

function applyAgentFields(node: BlueprintNode, props: Map<string, string>): void {
  node.agentType = props.get('agentType')
  node.prompt = stripQuotesFromProp(props, 'prompt')
  node.maxTokens = parseOptionalInt(props, 'maxTokens')
  node.timeout = parseOptionalInt(props, 'timeout')
}

function applyCommandFields(node: BlueprintNode, props: Map<string, string>): void {
  node.command = stripQuotesFromProp(props, 'command')
  node.expectedExitCode = parseOptionalInt(props, 'expectedExitCode')
}

function applyGateFields(node: BlueprintNode, props: Map<string, string>): void {
  node.onSuccess = props.get('onSuccess')
  node.onFailure = props.get('onFailure')
  node.condition = props.get('condition')
}

const NODE_FIELD_APPLICATORS: Record<string, (n: BlueprintNode, p: Map<string, string>) => void> = {
  agent: applyAgentFields,
  command: applyCommandFields,
  gate: applyGateFields,
}

export function parseNodeSection(
  id: string,
  content: string,
  logWarn: (msg: string, data: Record<string, unknown>) => void
): BlueprintNode | null {
  const props = extractNodeProps(content)
  const typeStr = mapGetOrEmpty(props, 'type')

  if (!VALID_NODE_TYPES.has(typeStr)) {
    logWarn(`Node '${id}' has invalid or missing type`, { type: typeStr })
    return null
  }

  const node: BlueprintNode = {
    id,
    type: typeStr as BlueprintNodeType,
    name: id,
    deps: parseYamlArray(mapGetOrEmpty(props, 'deps')),
  }

  NODE_FIELD_APPLICATORS[typeStr](node, props)
  node.maxRetries = parseOptionalInt(props, 'maxRetries')
  if (props.get('continueOnFailure') === 'true') node.continueOnFailure = true

  return node
}

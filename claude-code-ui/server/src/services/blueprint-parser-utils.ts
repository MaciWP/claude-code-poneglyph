const STRIP_QUOTES_RE = /^["']|["']$/g
const KV_RE = /^(\w+)\s*:\s*(.*)$/
const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/

export function stripQuotes(value: string): string {
  return value.replace(STRIP_QUOTES_RE, '')
}

function getOrDefault(record: Record<string, string>, key: string, fallback: string): string {
  const val = record[key]
  if (val !== undefined) return val
  return fallback
}

export function parseYamlArray(value: string): string[] {
  const bracketMatch = value.match(/^\[([^\]]*)\]$/)
  const raw = bracketMatch ? bracketMatch[1] : value
  return raw
    .split(',')
    .map((s) => stripQuotes(s.trim()))
    .filter(Boolean)
}

export function parseOptionalInt(props: Map<string, string>, key: string): number | undefined {
  const val = props.get(key)
  if (val === undefined) return undefined
  const num = parseInt(val, 10)
  if (isNaN(num)) return undefined
  return num
}

export interface ParsedFrontmatter {
  strings: Record<string, string>
  variablesBlock: string[]
}

export function getString(fm: ParsedFrontmatter, key: string, fallback = ''): string {
  return getOrDefault(fm.strings, key, fallback)
}

function handleNestedLine(
  trimmed: string,
  currentKey: string,
  fm: ParsedFrontmatter,
  blockLines: string[]
): void {
  const m = trimmed.match(KV_RE)
  if (!m) return
  const handlers: Record<string, () => void> = {
    triggers: () => {
      fm.strings[m[1]] = m[2]
    },
    variables: () => {
      blockLines.push(trimmed)
    },
  }
  const handler = handlers[currentKey]
  if (handler) handler()
}

function flushVariablesBlock(
  currentKey: string,
  blockLines: string[],
  fm: ParsedFrontmatter
): void {
  if (blockLines.length > 0 && currentKey === 'variables') {
    fm.variablesBlock = [...blockLines]
    blockLines.length = 0
  }
}

function processFrontmatterLine(
  line: string,
  state: { currentKey: string; inBlock: boolean },
  fm: ParsedFrontmatter,
  blockLines: string[]
): void {
  const trimmed = line.trim()
  if (!trimmed) return

  const isIndented = line.startsWith('  ') || line.startsWith('\t')
  if (state.inBlock && isIndented) {
    handleNestedLine(trimmed, state.currentKey, fm, blockLines)
    return
  }

  state.inBlock = false
  flushVariablesBlock(state.currentKey, blockLines, fm)

  const kvMatch = trimmed.match(KV_RE)
  if (!kvMatch) return

  const key = kvMatch[1]
  const value = kvMatch[2].trim()

  if (!value) {
    state.currentKey = key
    state.inBlock = true
    return
  }

  fm.strings[key] = stripQuotes(value)
  state.currentKey = key
}

export function extractFrontmatter(content: string): {
  frontmatter: ParsedFrontmatter
  body: string
} {
  const fm: ParsedFrontmatter = { strings: {}, variablesBlock: [] }
  const fmMatch = content.match(FRONTMATTER_RE)
  if (!fmMatch) return { frontmatter: fm, body: content }

  const state = { currentKey: '', inBlock: false }
  const blockLines: string[] = []

  for (const line of fmMatch[1].split('\n')) {
    processFrontmatterLine(line, state, fm, blockLines)
  }
  flushVariablesBlock(state.currentKey, blockLines, fm)

  return { frontmatter: fm, body: fmMatch[2] }
}

export function parseVariables(block: string[]): Record<string, string> | undefined {
  if (block.length === 0) return undefined
  const vars: Record<string, string> = {}
  for (const line of block) {
    const m = line.match(KV_RE)
    if (m) vars[m[1]] = stripQuotes(m[2])
  }
  if (Object.keys(vars).length === 0) return undefined
  return vars
}

export function parseComplexityRange(
  fm: ParsedFrontmatter
): { min?: number; max?: number } | undefined {
  const stringsMap = new Map(Object.entries(fm.strings))
  const minVal = parseOptionalInt(stringsMap, 'min')
  const maxVal = parseOptionalInt(stringsMap, 'max')
  if (minVal === undefined && maxVal === undefined) return undefined
  return { min: minVal, max: maxVal }
}

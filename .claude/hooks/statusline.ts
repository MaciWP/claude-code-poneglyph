#!/usr/bin/env bun
import { $ } from 'bun'

const input = JSON.parse(await Bun.stdin.text())

const MODEL = input.model?.display_name ?? '?'
const COST = input.cost?.total_cost_usd ?? 0
const LINES_ADDED = input.cost?.total_lines_added ?? 0
const LINES_REMOVED = input.cost?.total_lines_removed ?? 0

// Context limit
const CONTEXT_LIMIT = 200000

// Parse cost and estimate tokens
const costFloat = parseFloat(String(COST).replace(/[^0-9.]/g, '')) || 0
const estimatedTokens = Math.floor(costFloat * 22000)
const tokensK = Math.floor(estimatedTokens / 1000)

// Context percentage calculation
let contextPct = estimatedTokens > 0 ? Math.floor((estimatedTokens * 100) / CONTEXT_LIMIT) : 0
// After /compact, cost keeps growing but context resets - use modulo
if (contextPct > 100) {
  contextPct = contextPct % 100
}

// Git branch (cross-platform)
let branch = ''
try {
  branch = (await $`git branch --show-current`.text()).trim()
} catch { /* ignore */ }

// ANSI color codes
const cyan = '\x1b[36m'
const green = '\x1b[32m'
const yellow = '\x1b[33m'
const red = '\x1b[31m'
const redBold = '\x1b[31;1m'
const yellowBold = '\x1b[33;1m'
const whiteBoldRedBg = '\x1b[41;37;1m'
const dim = '\x1b[2m'
const reset = '\x1b[0m'

// Context color and warning based on percentage
let ctxColor = green
let ctxWarn = ''
let ctxMsg = ''

if (contextPct > 90) {
  ctxColor = whiteBoldRedBg
  ctxWarn = '\u{1F6A8} '
  ctxMsg = '\u00A1COMPACTAR YA!'
} else if (contextPct > 80) {
  ctxColor = redBold
  ctxWarn = '\u26A0\uFE0F '
  ctxMsg = '/compact'
} else if (contextPct > 65) {
  ctxColor = yellowBold
  ctxWarn = '\u23F0 '
} else if (contextPct > 50) {
  ctxColor = yellow
}

// Build output
let output = ''

// Model (cyan)
output += `${cyan}[${MODEL}]${reset}`

// Cost (yellow)
output += ` ${yellow}$${costFloat.toFixed(2)}${reset}`

// Git branch (green)
if (branch) {
  output += ` ${green}${branch}${reset}`
}

// Separator
output += ' |'

// Context percentage
output += ` ${ctxWarn}${ctxColor}~${contextPct}%${reset}`

// Warning message if set
if (ctxMsg) {
  output += ` ${redBold}${ctxMsg}${reset}`
}

output += ' |'

// Lines changed
output += ` +${LINES_ADDED}/-${LINES_REMOVED}`

// Token count (estimated)
if (tokensK > 0) {
  output += ` ${dim}(~${tokensK}k)${reset}`
}

console.log(output)

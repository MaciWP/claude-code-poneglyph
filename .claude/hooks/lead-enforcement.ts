#!/usr/bin/env bun
/**
 * Lead Enforcement Hook
 * Bloquea herramientas prohibidas cuando CLAUDE_LEAD_MODE=true
 * El Lead debe delegar a builder/scout en lugar de usar estas tools directamente.
 */

const BLOCKED_TOOLS = ['Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep']

async function main() {
  // Solo activar si CLAUDE_LEAD_MODE está habilitado
  if (process.env.CLAUDE_LEAD_MODE !== 'true') {
    process.exit(0) // ALLOW - no enforcement mode
  }

  const input = JSON.parse(await Bun.stdin.text())
  const toolName = input.tool_name

  if (BLOCKED_TOOLS.includes(toolName)) {
    console.error(`❌ Lead no puede usar ${toolName}. Delega a builder/scout.`)
    process.exit(2) // BLOCK
  }

  process.exit(0) // ALLOW
}

main().catch((err) => {
  console.error('Hook error:', err)
  process.exit(0) // Allow on error to not break workflow
})

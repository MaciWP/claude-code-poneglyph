#!/usr/bin/env bun
/**
 * Lead Enforcement Hook (PreToolUse)
 *
 * WARN-ONLY: nunca bloquea (siempre exit 0).
 * Emite un warning a stderr cuando la sesion principal usa tools directas
 * en lugar de delegar a subagentes. Es solo un recordatorio, no un bloqueador.
 *
 * Las reglas reales de orquestacion estan en rules/lead-orchestrator.md.
 */

async function main(): Promise<void> {
  const input = JSON.parse(await Bun.stdin.text());
  const tool = input.tool_name;

  if (
    process.env.CLAUDE_FREEZE_MODE === "true" &&
    ["Edit", "Write"].includes(tool)
  ) {
    console.error(
      "🔒 Freeze mode active: Edit/Write blocked. Use /freeze off to deactivate.",
    );
    process.exit(2);
  }

  if (process.env.CLAUDE_LEAD_MODE !== "true") {
    process.exit(0);
  }
  const directTools = ["Read", "Edit", "Write", "Bash", "Glob", "Grep"];

  if (directTools.includes(tool)) {
    console.error(`⚠️ Lead: ${tool} directo. Considera delegar.`);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));

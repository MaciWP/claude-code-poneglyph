#!/usr/bin/env bun
// PreCompact hook: saves current session state before compaction.
// Observability only — always exits 0.

import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { readHookStdin } from "./lib/hook-stdin";

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    const input: Record<string, unknown> = raw.trim() ? JSON.parse(raw) : {};

    const tracesDir = join(homedir(), ".claude", "traces");
    mkdirSync(tracesDir, { recursive: true });

    const filePath = join(tracesDir, "pre-compact.jsonl");
    const file = Bun.file(filePath);
    const existing = (await file.exists()) ? await file.text() : "";

    const entry = {
      ts: new Date().toISOString(),
      session_id: input.session_id ?? null,
    };

    await Bun.write(filePath, existing + JSON.stringify(entry) + "\n");
  } catch {
    // best-effort — never block
  }

  process.exit(0);
}

if (import.meta.main) {
  main();
}

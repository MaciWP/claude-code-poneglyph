#!/usr/bin/env bun
// InstructionsLoaded hook: logs which CLAUDE.md and rules were loaded.
// Observability only — always exits 0.

import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { readHookStdin } from "./lib/hook-stdin";

interface InstructionsLoadedInput {
  session_id?: string;
  files?: string[];
  [key: string]: unknown;
}

async function appendToTrace(entry: Record<string, unknown>): Promise<void> {
  const tracesDir = join(homedir(), ".claude", "traces");
  mkdirSync(tracesDir, { recursive: true });

  const filePath = join(tracesDir, "instructions-loaded.jsonl");
  const file = Bun.file(filePath);
  const existing = (await file.exists()) ? await file.text() : "";
  await Bun.write(filePath, existing + JSON.stringify(entry) + "\n");
}

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    if (!raw.trim()) {
      process.exit(0);
    }

    const input: InstructionsLoadedInput = JSON.parse(raw);
    const files: string[] = Array.isArray(input.files) ? input.files : [];

    process.stderr.write(
      `[instructions-loaded] Loaded: ${files.length > 0 ? files.join(", ") : "(none)"}\n`,
    );

    await appendToTrace({
      ts: new Date().toISOString(),
      session_id: input.session_id ?? null,
      files,
    });
  } catch {
    // best-effort — never block
  }

  process.exit(0);
}

if (import.meta.main) {
  main();
}

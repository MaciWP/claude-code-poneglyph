#!/usr/bin/env bun

import { readHookStdin } from "../../lib/hook-stdin";
import { ContextRegistry } from "./registry";

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    const input = JSON.parse(raw);

    if (input.tool_name !== "Read") {
      process.exit(0);
    }

    const filePath = input.tool_input?.file_path;
    if (typeof filePath !== "string" || !filePath) {
      process.exit(0);
    }

    const registry = new ContextRegistry();
    registry.record(filePath);
  } catch {
    // Best effort — never block
  }

  process.exit(0);
}

main();

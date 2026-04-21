#!/usr/bin/env bun

import { readHookStdin } from "../../lib/hook-stdin";
import { ContextRegistry } from "./registry";

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    const input = JSON.parse(raw);

    if (input.tool_name !== "Edit") {
      process.exit(0);
    }

    const filePath = input.tool_input?.file_path;
    if (typeof filePath !== "string" || !filePath) {
      process.exit(0);
    }

    const registry = new ContextRegistry();
    const result = registry.check(filePath);

    if (result.isStale) {
      console.error(result.message);
      process.exit(2);
    }
  } catch {
    // On error, allow the operation (fail open)
    process.exit(0);
  }

  process.exit(0);
}

main();

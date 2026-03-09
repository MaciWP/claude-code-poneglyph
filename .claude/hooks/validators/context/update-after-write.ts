#!/usr/bin/env bun

import { ContextRegistry } from "./registry";

async function main(): Promise<void> {
  try {
    const raw = await readStdin();
    const input = JSON.parse(raw);

    if (input.tool_name !== "Edit" && input.tool_name !== "Write") {
      process.exit(0);
    }

    const filePath = input.tool_input?.file_path;
    if (typeof filePath !== "string" || !filePath) {
      process.exit(0);
    }

    const registry = new ContextRegistry();
    registry.update(filePath);
  } catch {
    // Best effort — never block
  }

  process.exit(0);
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", () => resolve(""));
    process.stdin.resume();
  });
}

main();

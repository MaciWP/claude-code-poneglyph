#!/usr/bin/env bun

import { createStore, closeStore, getSessionDbPath } from "./lib/context-store/store";
import { indexContent } from "./lib/context-store/indexer";

const MIN_SIZE_BYTES = 4096;

interface ToolUseInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: string;
  tool_response?: string;
}

async function main(): Promise<void> {
  try {
    const raw = await readStdin();
    if (!raw) return;

    const data: ToolUseInput = JSON.parse(raw);
    const response = data.tool_output ?? data.tool_response ?? "";

    if (response.length < MIN_SIZE_BYTES) return;

    const source = extractSource(data.tool_name, data.tool_input);
    const dbPath = getSessionDbPath();
    const db = createStore(dbPath);

    try {
      const chunks = indexContent(db, source, response, `session-${process.ppid}`);
      if (chunks > 0) {
        console.error(
          `[context-virtualizer] indexed: ${source} (${chunks} chunks, ${response.length} chars)`,
        );
      }
    } finally {
      closeStore(db);
    }
  } catch {
    // best-effort — never block Claude Code
  }
}

function extractSource(toolName: string, toolInput: Record<string, unknown>): string {
  switch (toolName) {
    case "Read":
      return String(toolInput.file_path ?? toolInput.path ?? "unknown-read");
    case "Grep":
      return `grep:${String(toolInput.pattern ?? "unknown")}`;
    case "Bash": {
      const cmd = String(toolInput.command ?? "unknown-cmd").slice(0, 80);
      return `bash:${cmd}`;
    }
    default:
      return `${toolName}:unknown`;
  }
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

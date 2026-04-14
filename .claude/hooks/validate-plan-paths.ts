#!/usr/bin/env bun

import { readHookStdin } from "./lib/hook-stdin";
import {
  findMissingPaths,
  isPlanFile,
  pickContent,
  readFileSafe,
} from "./lib/plan-path-checker";
import type { ExtractedPath } from "./lib/path-extractor";

interface HookInput {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    content?: string;
    new_string?: string;
    [key: string]: unknown;
  };
}

function parseInput(raw: string): HookInput {
  try {
    return JSON.parse(raw) as HookInput;
  } catch {
    return {};
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getContent(input: HookInput, filePath: string): string {
  const ti = input.tool_input ?? {};
  return pickContent(asString(ti.content), readFileSafe(filePath), asString(ti.new_string));
}

function resolveTargetPath(input: HookInput): string {
  const tool = input.tool_name ?? "";
  const isValidTool = tool === "Write" || tool === "Edit";
  const filePath = asString(input.tool_input?.file_path);
  const valid = isValidTool && filePath.length > 0 && isPlanFile(filePath);
  return valid ? filePath : "";
}

function emitWarning(planPath: string, missing: ExtractedPath[]): void {
  const lines = missing.map((m) => `  line ${m.line}: ${m.path}`).join("\n");
  console.error(
    `[validate-plan-paths] Plan file ${planPath} references missing paths:\n${lines}\n` +
      `If these are intentionally NEW files, mark them with "(NEW)" or "new:" prefix near the path.\n` +
      `If these are typos or stale paths, fix before executing the plan.`,
  );
}

async function run(): Promise<void> {
  const raw = await readHookStdin();
  const input = parseInput(raw);
  const filePath = resolveTargetPath(input);
  if (filePath.length === 0) return;
  const content = getContent(input, filePath);
  if (content.length === 0) return;
  const missing = findMissingPaths(content);
  if (missing.length > 0) emitWarning(filePath, missing);
}

run()
  .catch((err: unknown) =>
    console.error(`[validate-plan-paths] error: ${String((err as Error).message)}`),
  )
  .finally(() => process.exit(0));

#!/usr/bin/env bun
import { readdirSync, statSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const KEEP_COUNT = 100;
const RUN_EVERY = 50;
const DIR = process.env.CLEANUP_OPT_HISTORY_DIR ?? join(homedir(), ".claude", "optimization-history");
const COUNTER_FILE = join(homedir(), ".claude", ".cleanup-counter");

function readCounter(): number {
  try {
    return parseInt(readFileSync(COUNTER_FILE, "utf-8").trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function writeCounter(n: number): void {
  try {
    writeFileSync(COUNTER_FILE, String(n));
  } catch {}
}

async function main(): Promise<void> {
  const counter = readCounter() + 1;
  writeCounter(counter);

  if (counter % RUN_EVERY !== 0 && !process.env.CLEANUP_FORCE) return;
  if (!existsSync(DIR)) return;

  const files = readdirSync(DIR)
    .map((f) => ({ name: f, mtime: statSync(join(DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const toDelete = files.slice(KEEP_COUNT);
  for (const f of toDelete) rmSync(join(DIR, f.name));

  if (toDelete.length > 0) {
    process.stdout.write(
      `[cleanup] removed ${toDelete.length} files from ${DIR}, kept ${Math.min(files.length, KEEP_COUNT)}\n`,
    );
  }
}

main().catch(() => {}).finally(() => process.exit(0));

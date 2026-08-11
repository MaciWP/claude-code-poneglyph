#!/usr/bin/env bun

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseArgs } from "node:util";

export const PORTABLE_SKILLS = ["dev", "verify", "anti-hallucination"] as const;

export interface CodexLink {
  source: string;
  dest: string;
  type: "file" | "directory";
}

export type LinkStatus = "missing" | "linked" | "local" | "conflict";

export function buildCodexLinks(projectRoot: string, homeDir: string): CodexLink[] {
  const codexRoot = path.join(homeDir, ".codex");
  return [
    {
      source: path.join(projectRoot, "CLAUDE.md"),
      dest: path.join(codexRoot, "AGENTS.md"),
      type: "file",
    },
    ...PORTABLE_SKILLS.map((name) => ({
      source: path.join(projectRoot, ".claude", "skills", name),
      dest: path.join(codexRoot, "skills", name),
      type: "directory" as const,
    })),
  ];
}

function exists(p: string): boolean {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function targetMatches(link: CodexLink): boolean {
  try {
    if (!fs.lstatSync(link.dest).isSymbolicLink()) return false;
    // Windows junctions readlink with the \\?\ long-path prefix — strip it.
    const target = fs.readlinkSync(link.dest).replace(/^\\\\\?\\/, "");
    const resolved = path.resolve(path.dirname(link.dest), target);
    return path.resolve(resolved) === path.resolve(link.source);
  } catch {
    return false;
  }
}

// Windows: directory junctions need no privileges; file symlinks require
// developer mode, so the doctrine file is installed as a copy instead.
export function linkMethodFor(
  type: CodexLink["type"],
  platform: NodeJS.Platform = process.platform,
): "symlink" | "junction" | "copy" {
  if (platform !== "win32") return "symlink";
  return type === "directory" ? "junction" : "copy";
}

function copyMatches(link: CodexLink): boolean {
  try {
    if (!fs.lstatSync(link.dest).isFile()) return false;
    return fs.readFileSync(link.dest, "utf8") === fs.readFileSync(link.source, "utf8");
  } catch {
    return false;
  }
}

export function linkStatus(link: CodexLink, platform: NodeJS.Platform = process.platform): LinkStatus {
  if (!exists(link.dest)) return "missing";
  if (targetMatches(link)) return "linked";
  // Where the install method is a copy, a content-equal copy is healthy.
  if (linkMethodFor(link.type, platform) === "copy" && copyMatches(link)) return "linked";
  try {
    return fs.lstatSync(link.dest).isSymbolicLink() ? "conflict" : "local";
  } catch {
    return "missing";
  }
}

function createLink(link: CodexLink, backup: boolean): void {
  const status = linkStatus(link);
  if (status === "linked") return;
  if (status !== "missing") {
    if (!backup) {
      throw new Error(`${link.dest} already exists; rerun with --backup to replace it`);
    }
    const backupPath = `${link.dest}.poneglyph-backup-${Date.now()}`;
    fs.renameSync(link.dest, backupPath);
    console.log(`backup: ${link.dest} -> ${backupPath}`);
  }
  fs.mkdirSync(path.dirname(link.dest), { recursive: true });
  const method = linkMethodFor(link.type);
  if (method === "copy") {
    fs.copyFileSync(link.source, link.dest);
    console.log(
      `copied ${link.dest} (Windows file symlinks need developer mode); re-run the sync after editing ${path.basename(link.source)}`,
    );
  } else {
    fs.symlinkSync(
      link.source,
      link.dest,
      method === "junction" ? "junction" : link.type === "directory" ? "dir" : "file",
    );
  }
}

function printStatus(links: CodexLink[]): void {
  for (const link of links) {
    console.log(`${linkStatus(link).padEnd(8)} ${link.dest}`);
  }
}

function usage(): void {
  console.log(`
sync-codex - install Poneglyph's portable Codex adapter

Usage:
  bun .claude/scripts/sync-codex.ts [--status|--execute|--unlink] [--backup] [--force]

Installs:
  ~/.codex/AGENTS.md       global Poneglyph doctrine
  ~/.codex/skills/{dev,verify,anti-hallucination}

Codex hooks are intentionally not installed. Claude hooks depend on Claude event
payloads and cannot be treated as a compatible Codex implementation.

On Windows, skills install as directory junctions (no admin) and AGENTS.md as a
copy - re-run the sync after editing CLAUDE.md.
`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      status: { type: "boolean", default: false },
      execute: { type: "boolean", default: false },
      unlink: { type: "boolean", default: false },
      backup: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) return usage();

  if ((values.execute || values.unlink) && !values.force && !process.stdin.isTTY) {
    throw new Error("non-interactive mutation requires --force");
  }

  const projectRoot = path.resolve(import.meta.dir, "../..");
  const links = buildCodexLinks(projectRoot, os.homedir());
  if (values.status) return printStatus(links);

  if (values.unlink) {
    for (const link of links) {
      if (linkStatus(link) === "linked") fs.unlinkSync(link.dest);
    }
    console.log("removed Poneglyph Codex links");
    return;
  }

  if (!values.execute) {
    printStatus(links);
    console.log("preview only; pass --execute to create missing links");
    return;
  }

  for (const link of links) createLink(link, values.backup ?? false);
  printStatus(links);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`sync-codex failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

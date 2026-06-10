#!/usr/bin/env bun
// .claude/commands/sync-claude.ts
// Syncs .claude/ from poneglyph to ~/.claude/ via symlinks
// Supports: Windows (junction/symlink), macOS, Linux

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { parseArgs } from "util";
import { $ } from "bun";

// === CONFIGURATION ===

const LINK_FOLDERS = [
  "skills",
  "commands",
  "rules",
  "docs",
  "hooks",
  "workflows",
  "output-styles",
];

const LINK_FILES = [
  { src: "CLAUDE.md", dest: "CLAUDE.md" },
];

// settings.json is NOT symlinked: it is GENERATED per-machine as a real file by
// deep-merging the committed base with an optional gitignored machine overlay.
// Why: the user-scope (~/.claude) settings.json applies to every project on every
// OS, but a few keys are irreducibly machine-specific — env.PATH cannot be a single
// cross-OS string, and the macOS GUI app launches with a minimal PATH that needs it.
// Symlinking the cross-OS committed file therefore broke statusLine + hooks on macOS
// outside poneglyph (2026-06-08). The base stays the single source of truth for
// shared keys (regenerated each sync → no drift); the overlay carries only machine
// paths. Replaces the previous symlink added 2026-05-30.
const MERGED_SETTINGS = {
  base: ".claude/settings.json", // committed, shared, cross-OS
  overlay: ".claude/settings.machine.json", // gitignored, per-machine, optional
  dest: "settings.json", // → ~/.claude/settings.json (real file)
};

// External links: src is relative to projectRoot/.claude/, dest is an absolute path outside ~/.claude/
const LINK_EXTERNAL_DIRS = [
  {
    src: "ccstatusline",
    dest: path.join(os.homedir(), ".config", "ccstatusline"),
  },
];

// === TYPES ===

interface LinkInfo {
  source: string;
  dest: string;
  type: "directory" | "file";
  status: "new" | "exists" | "conflict" | "already-linked";
}

interface Config {
  execute: boolean;
  backup: boolean;
  unlink: boolean;
  status: boolean;
  force: boolean;
  check: boolean;
  validateHooks: boolean;
  method: "auto" | "symlink" | "junction" | "copy";
}

interface HookEntry {
  phase: string;
  matcher: string;
  filePath: string;
  exists: boolean;
}

interface SystemInfo {
  os: "windows" | "macos" | "linux" | "unknown";
  osVersion: string;
  isAdmin: boolean;
  canSymlink: boolean;
  canJunction: boolean;
  devModeEnabled: boolean | null;
  homeDir: string;
  shell: string;
  recommendations: string[];
}

// === SYSTEM DETECTION ===

async function getSystemInfo(): Promise<SystemInfo> {
  const platform = process.platform;
  const info: SystemInfo = {
    os:
      platform === "win32"
        ? "windows"
        : platform === "darwin"
          ? "macos"
          : platform === "linux"
            ? "linux"
            : "unknown",
    osVersion: os.release(),
    isAdmin: false,
    canSymlink: false,
    canJunction: false,
    devModeEnabled: null,
    homeDir: os.homedir(),
    shell: process.env.SHELL || process.env.ComSpec || "unknown",
    recommendations: [],
  };

  if (info.os === "windows") {
    await checkWindowsCapabilities(info);
  } else {
    await checkUnixCapabilities(info);
  }

  return info;
}

async function checkWindowsCapabilities(info: SystemInfo): Promise<void> {
  // Check if admin
  try {
    const result = await $`net session 2>&1`.quiet().nothrow();
    info.isAdmin = result.exitCode === 0;
  } catch {
    info.isAdmin = false;
  }

  // Check Developer Mode (Windows 10+)
  try {
    const result =
      await $`reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModelUnlock" /v AllowDevelopmentWithoutDevLicense 2>&1`
        .quiet()
        .nothrow();
    const output = result.stdout.toString();
    info.devModeEnabled = output.includes("0x1");
  } catch {
    info.devModeEnabled = null;
  }

  // Real symlink test
  const testDir = path.join(os.tmpdir(), `symlink-test-${Date.now()}`);
  const testLink = path.join(os.tmpdir(), `symlink-test-link-${Date.now()}`);

  try {
    fs.mkdirSync(testDir);
    fs.symlinkSync(testDir, testLink, "dir");
    info.canSymlink = true;
    fs.unlinkSync(testLink);
  } catch {
    info.canSymlink = false;
  } finally {
    try {
      fs.rmdirSync(testDir);
    } catch {}
  }

  // Junction test (always works on Windows without special permissions)
  const testJunction = path.join(os.tmpdir(), `junction-test-${Date.now()}`);
  try {
    fs.mkdirSync(testDir);
    fs.symlinkSync(testDir, testJunction, "junction");
    info.canJunction = true;
    fs.unlinkSync(testJunction);
  } catch {
    info.canJunction = false;
  } finally {
    try {
      fs.rmdirSync(testDir);
    } catch {}
  }

  // Recommendations
  if (!info.canSymlink && !info.devModeEnabled) {
    info.recommendations.push(
      "🔧 Enable Developer Mode for symlinks:",
      "   Settings → Privacy & Security → For developers → Developer Mode: ON",
      "   Or run as Administrator",
    );
  }

  if (!info.canSymlink && info.canJunction) {
    info.recommendations.push(
      "💡 Junctions will be used (work without special permissions)",
      "   Junctions are equivalent to symlinks for folders",
    );
  }
}

async function checkUnixCapabilities(info: SystemInfo): Promise<void> {
  // On Unix, symlinks always work for the user
  info.canSymlink = true;
  info.canJunction = false; // Does not exist on Unix

  // Check if root
  info.isAdmin = process.getuid?.() === 0;

  // Check home permissions
  try {
    const testFile = path.join(info.homeDir, `.symlink-test-${Date.now()}`);
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
  } catch {
    info.recommendations.push(
      "⚠️ You do not have write permissions on your home directory",
      `   Check permissions of: ${info.homeDir}`,
    );
    info.canSymlink = false;
  }

  // macOS specific
  if (info.os === "macos") {
    // Check SIP if relevant
    try {
      const result = await $`csrutil status 2>&1`.quiet().nothrow();
      const output = result.stdout.toString();
      if (output.includes("enabled")) {
        info.recommendations.push(
          "ℹ️ SIP is enabled (normal, does not affect ~/.claude)",
        );
      }
    } catch {}
  }
}

function printSystemInfo(info: SystemInfo): void {
  console.log("\n🖥️  System Information:\n");

  const osNames: Record<string, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
    unknown: "Unknown",
  };

  console.log(`   OS:              ${osNames[info.os]} ${info.osVersion}`);
  console.log(`   Home:            ${info.homeDir}`);
  console.log(`   Shell:           ${info.shell}`);
  console.log(`   Admin/Root:      ${info.isAdmin ? "✅ Yes" : "❌ No"}`);

  if (info.os === "windows") {
    console.log(
      `   Developer Mode:  ${info.devModeEnabled === true ? "✅ Enabled" : info.devModeEnabled === false ? "❌ Disabled" : "❓ Not detected"}`,
    );
    console.log(
      `   Symlinks:        ${info.canSymlink ? "✅ Available" : "❌ Not available"}`,
    );
    console.log(
      `   Junctions:       ${info.canJunction ? "✅ Available" : "❌ Not available"}`,
    );
  } else {
    console.log(
      `   Symlinks:        ${info.canSymlink ? "✅ Available" : "❌ Not available"}`,
    );
  }

  // Final capability
  const canLink = info.canSymlink || info.canJunction;
  console.log(`\n   Can link:        ${canLink ? "✅ YES" : "❌ NO"}`);

  if (info.recommendations.length > 0) {
    console.log("\n📋 Recommendations:\n");
    info.recommendations.forEach((r) => console.log(`   ${r}`));
  }
}

// === UTILITIES ===

function getHomeDir(): string {
  return os.homedir();
}

function getProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function isSymlink(p: string): boolean {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function getSymlinkTarget(p: string): string | null {
  try {
    return fs.readlinkSync(p);
  } catch {
    return null;
  }
}

function isWindows(): boolean {
  return process.platform === "win32";
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").toLowerCase();
}

// === MERGED SETTINGS (machine-specific, generated — not symlinked) ===

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Recursive deep-merge: nested plain objects merge per-key (so `env` keeps base
// keys + overlay PATH); arrays and scalars are replaced by the overlay.
function deepMerge(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const existing = out[key];
    out[key] =
      isPlainObject(value) && isPlainObject(existing)
        ? deepMerge(existing, value)
        : value;
  }
  return out;
}

interface SettingsResult {
  status: "written" | "preview" | "error";
  overlayApplied: boolean;
  message: string;
}

// Generates ~/.claude/settings.json as a REAL file = deepMerge(base, machine overlay).
// With config.execute=false it only previews. Replaces any prior symlink in place.
function generateSettings(
  projectRoot: string,
  homeDir: string,
  config: Config,
): SettingsResult {
  const basePath = path.join(projectRoot, MERGED_SETTINGS.base);
  const overlayPath = path.join(projectRoot, MERGED_SETTINGS.overlay);
  const destPath = path.join(homeDir, ".claude", MERGED_SETTINGS.dest);

  if (!fs.existsSync(basePath)) {
    return {
      status: "error",
      overlayApplied: false,
      message: `base not found: ${basePath}`,
    };
  }

  let merged: Record<string, unknown>;
  let overlayApplied = false;
  try {
    const base = JSON.parse(fs.readFileSync(basePath, "utf-8")) as Record<
      string,
      unknown
    >;
    if (fs.existsSync(overlayPath)) {
      const overlay = JSON.parse(fs.readFileSync(overlayPath, "utf-8")) as Record<
        string,
        unknown
      >;
      merged = deepMerge(base, overlay);
      overlayApplied = true;
    } else {
      merged = base;
    }
  } catch (error) {
    return {
      status: "error",
      overlayApplied: false,
      message: `parse error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!config.execute) {
    return {
      status: "preview",
      overlayApplied,
      message: overlayApplied
        ? "would merge base + machine overlay → real file"
        : "would copy base → real file (no machine overlay found)",
    };
  }

  // Backup + remove existing (symlink OR real file) before writing.
  if (fs.existsSync(destPath) || isSymlink(destPath)) {
    if (config.backup) {
      const backupDir = path.join(
        homeDir,
        ".claude.backup",
        new Date().toISOString().split("T")[0],
      );
      fs.mkdirSync(backupDir, { recursive: true });
      const backupPath = path.join(backupDir, MERGED_SETTINGS.dest);
      if (isSymlink(destPath)) {
        fs.writeFileSync(
          backupPath + ".symlink",
          getSymlinkTarget(destPath) || "unknown",
        );
      } else {
        fs.copyFileSync(destPath, backupPath);
      }
    }
    fs.unlinkSync(destPath); // unlinkSync removes both symlinks and regular files
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, JSON.stringify(merged, null, 2) + "\n");

  return {
    status: "written",
    overlayApplied,
    message: overlayApplied
      ? "merged base + machine overlay → ~/.claude/settings.json"
      : "copied base → ~/.claude/settings.json (no machine overlay)",
  };
}

// === LINK DETECTION ===

function detectLinks(projectRoot: string, homeDir: string): LinkInfo[] {
  const links: LinkInfo[] = [];
  const srcBase = path.join(projectRoot, ".claude");
  const destBase = path.join(homeDir, ".claude");

  for (const folder of LINK_FOLDERS) {
    const source = path.join(srcBase, folder);
    const dest = path.join(destBase, folder);

    if (!fs.existsSync(source)) continue;

    let status: LinkInfo["status"] = "new";

    if (fs.existsSync(dest)) {
      if (isSymlink(dest)) {
        const target = getSymlinkTarget(dest);
        const resolvedTarget = target
          ? path.resolve(path.dirname(dest), target)
          : null;

        if (
          normalizePath(target || "") === normalizePath(source) ||
          normalizePath(resolvedTarget || "") === normalizePath(source)
        ) {
          status = "already-linked";
        } else {
          status = "conflict";
        }
      } else {
        status = "exists";
      }
    }

    links.push({ source, dest, type: "directory", status });
  }

  for (const file of LINK_FILES) {
    const source = path.join(projectRoot, file.src);
    const dest = path.join(destBase, file.dest);

    if (!fs.existsSync(source)) continue;

    let status: LinkInfo["status"] = "new";

    if (fs.existsSync(dest)) {
      if (isSymlink(dest)) {
        const target = getSymlinkTarget(dest);
        const resolvedTarget = target
          ? path.resolve(path.dirname(dest), target)
          : null;

        if (
          normalizePath(target || "") === normalizePath(source) ||
          normalizePath(resolvedTarget || "") === normalizePath(source)
        ) {
          status = "already-linked";
        } else {
          status = "conflict";
        }
      } else {
        status = "exists";
      }
    }

    links.push({ source, dest, type: "file", status });
  }

  for (const ext of LINK_EXTERNAL_DIRS) {
    const source = path.join(srcBase, ext.src);
    const dest = ext.dest;

    if (!fs.existsSync(source)) continue;

    let status: LinkInfo["status"] = "new";

    if (fs.existsSync(dest)) {
      if (isSymlink(dest)) {
        const target = getSymlinkTarget(dest);
        const resolvedTarget = target
          ? path.resolve(path.dirname(dest), target)
          : null;

        if (
          normalizePath(target || "") === normalizePath(source) ||
          normalizePath(resolvedTarget || "") === normalizePath(source)
        ) {
          status = "already-linked";
        } else {
          status = "conflict";
        }
      } else {
        status = "exists";
      }
    }

    links.push({ source, dest, type: "directory", status });
  }

  return links;
}

// === PREVIEW ===

function printPreview(links: LinkInfo[], method: string): void {
  console.log("\n📋 Symlink preview:\n");
  console.log(`   Method: ${method}\n`);

  const grouped = {
    new: links.filter((l) => l.status === "new"),
    exists: links.filter((l) => l.status === "exists"),
    conflict: links.filter((l) => l.status === "conflict"),
    linked: links.filter((l) => l.status === "already-linked"),
  };

  if (grouped.linked.length) {
    console.log("✅ Already linked:");
    grouped.linked.forEach((l) =>
      console.log(`   ${path.basename(l.dest)} → ${l.source}`),
    );
  }

  if (grouped.new.length) {
    console.log("\n🆕 New (will be created):");
    grouped.new.forEach((l) =>
      console.log(`   + ${path.basename(l.dest)} → ${l.source}`),
    );
  }

  if (grouped.exists.length) {
    console.log("\n⚠️  Existing (will be replaced with --backup):");
    grouped.exists.forEach((l) => console.log(`   ~ ${l.dest}`));
  }

  if (grouped.conflict.length) {
    console.log("\n❌ Conflicts (symlink points elsewhere):");
    grouped.conflict.forEach((l) => {
      const target = getSymlinkTarget(l.dest);
      console.log(`   ! ${l.dest} → ${target}`);
    });
  }

  const toCreate =
    grouped.new.length + grouped.exists.length + grouped.conflict.length;
  console.log(
    `\n📊 Summary: ${grouped.linked.length} already linked, ${toCreate} to create/update`,
  );
}

// === SYMLINK CREATION ===

function determineLinkMethod(
  info: SystemInfo,
  config: Config,
): "symlink" | "junction" | "copy" {
  if (config.method !== "auto") {
    return config.method === "symlink"
      ? "symlink"
      : config.method === "junction"
        ? "junction"
        : "copy";
  }

  if (info.os === "windows") {
    if (info.canSymlink) return "symlink";
    if (info.canJunction) return "junction";
    return "copy";
  }

  return info.canSymlink ? "symlink" : "copy";
}

async function createSymlinks(
  links: LinkInfo[],
  config: Config,
  info: SystemInfo,
): Promise<void> {
  const homeDir = getHomeDir();
  const destBase = path.join(homeDir, ".claude");
  const backupDir = path.join(
    homeDir,
    ".claude.backup",
    new Date().toISOString().split("T")[0],
  );

  const method = determineLinkMethod(info, config);

  if (!fs.existsSync(destBase)) {
    fs.mkdirSync(destBase, { recursive: true });
    console.log(`📁 Created ${destBase}`);
  }

  console.log(`\n🔗 Link method: ${method}\n`);

  for (const link of links) {
    if (link.status === "already-linked") {
      console.log(`⏭️  Skipping ${path.basename(link.dest)} (already linked)`);
      continue;
    }

    // Backup if exists
    if (
      (link.status === "exists" || link.status === "conflict") &&
      config.backup
    ) {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, path.basename(link.dest));

      if (isSymlink(link.dest)) {
        const target = getSymlinkTarget(link.dest);
        fs.writeFileSync(backupPath + ".symlink", target || "unknown");
      } else {
        fs.renameSync(link.dest, backupPath);
      }
      console.log(`💾 Backup: ${link.dest} → ${backupPath}`);
    }

    // Remove existing
    if (fs.existsSync(link.dest) || isSymlink(link.dest)) {
      if (isSymlink(link.dest)) {
        fs.unlinkSync(link.dest);
      } else if (!config.backup) {
        fs.rmSync(link.dest, { recursive: true, force: true });
      }
    }

    // Ensure parent directory exists (required for external links outside ~/.claude/)
    fs.mkdirSync(path.dirname(link.dest), { recursive: true });

    // Create link according to method
    try {
      switch (method) {
        case "symlink":
          if (isWindows()) {
            fs.symlinkSync(
              link.source,
              link.dest,
              link.type === "directory" ? "dir" : "file",
            );
          } else {
            fs.symlinkSync(link.source, link.dest);
          }
          break;

        case "junction":
          if (link.type === "directory") {
            fs.symlinkSync(link.source, link.dest, "junction");
          } else {
            // Junction does not support files, use hardlink or copy
            fs.copyFileSync(link.source, link.dest);
            console.log(`   ⚠️ File copied (junction does not support files)`);
          }
          break;

        case "copy":
          if (link.type === "directory") {
            fs.cpSync(link.source, link.dest, { recursive: true });
          } else {
            fs.copyFileSync(link.source, link.dest);
          }
          console.log(
            `   ⚠️ Copied (not linked - changes will not be synced)`,
          );
          break;
      }

      const icon = method === "copy" ? "📄" : "🔗";
      console.log(
        `${icon} Created: ${path.basename(link.dest)} → ${link.source}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("EPERM")) {
          console.error(
            `❌ Permission error creating ${path.basename(link.dest)}`,
          );
          printPermissionHelp(info);
        } else {
          console.error(`❌ Error: ${error.message}`);
        }
      }
    }
  }
}

function printPermissionHelp(info: SystemInfo): void {
  if (info.os === "windows") {
    console.log("\n💡 Solutions for Windows:");
    console.log("   1. Enable Developer Mode:");
    console.log(
      "      Settings → Privacy & Security → For developers → Developer Mode: ON",
    );
    console.log("   2. Or run terminal as Administrator");
    console.log(
      "   3. Or use --method junction (does not require special permissions)",
    );
  } else if (info.os === "macos") {
    console.log("\n💡 Solutions for macOS:");
    console.log("   1. Check your home permissions: ls -la ~");
    console.log("   2. If using FileVault, ensure it is unlocked");
  } else {
    console.log("\n💡 Solutions for Linux:");
    console.log("   1. Check permissions: ls -la ~/.claude");
    console.log("   2. If needed: sudo chown -R $USER ~/.claude");
  }
}

// === UNLINK ===

function unlinkAll(links: LinkInfo[]): void {
  for (const link of links) {
    if (isSymlink(link.dest)) {
      fs.unlinkSync(link.dest);
      console.log(`🗑️  Removed symlink: ${link.dest}`);
    }
  }
}

// === STATUS ===

function printStatus(links: LinkInfo[]): void {
  console.log("\n📊 Current state of ~/.claude:\n");

  const homeDir = getHomeDir();
  const destBase = path.join(homeDir, ".claude");

  if (!fs.existsSync(destBase)) {
    console.log("❌ ~/.claude does not exist");
    return;
  }

  for (const link of links) {
    const exists = fs.existsSync(link.dest) || isSymlink(link.dest);
    const isLink = isSymlink(link.dest);
    const target = isLink ? getSymlinkTarget(link.dest) : null;

    if (!exists) {
      console.log(`⚪ ${path.basename(link.dest)}: does not exist`);
    } else if (isLink) {
      const resolvedTarget = target
        ? path.resolve(path.dirname(link.dest), target)
        : null;
      const pointsToProject =
        normalizePath(target || "") === normalizePath(link.source) ||
        normalizePath(resolvedTarget || "") === normalizePath(link.source);

      if (pointsToProject) {
        console.log(`🟢 ${path.basename(link.dest)}: ✓ linked to poneglyph`);
      } else {
        console.log(`🟡 ${path.basename(link.dest)}: symlink to ${target}`);
      }
    } else {
      console.log(`🔵 ${path.basename(link.dest)}: local folder/file`);
    }
  }

  // settings.json is a generated real file (not a symlink) — report it explicitly.
  const settingsDest = path.join(destBase, "settings.json");
  const overlayPath = path.join(getProjectRoot(), MERGED_SETTINGS.overlay);
  if (!fs.existsSync(settingsDest) && !isSymlink(settingsDest)) {
    console.log(`⚪ settings.json: does not exist (run --execute)`);
  } else if (isSymlink(settingsDest)) {
    console.log(
      `🟡 settings.json: STALE symlink — should be a generated real file, run --execute`,
    );
  } else {
    console.log(
      `🟢 settings.json: generated real file ${fs.existsSync(overlayPath) ? "(base + machine overlay)" : "(base only — no machine overlay)"}`,
    );
  }
}

// === VALIDATE HOOKS ===

function extractBunFilePath(command: string): string | null {
  // Matches: bun <file>, bun run <file>, bunx <file>
  const match = command.match(/\bbun(?:x| run)?\s+(\S+\.ts\b)/);
  return match ? match[1] : null;
}

function expandHome(p: string): string {
  if (p.startsWith("$HOME")) {
    return path.join(os.homedir(), p.slice(5));
  }
  if (p.startsWith("~")) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

function collectHookEntries(settings: Record<string, unknown>): HookEntry[] {
  const entries: HookEntry[] = [];
  const hooks = settings.hooks as Record<string, unknown> | undefined;

  if (hooks && typeof hooks === "object") {
    for (const [phase, phaseValue] of Object.entries(hooks)) {
      if (!Array.isArray(phaseValue)) continue;
      for (const hookGroup of phaseValue) {
        if (typeof hookGroup !== "object" || hookGroup === null) continue;
        const group = hookGroup as Record<string, unknown>;
        const matcher =
          typeof group.matcher === "string" && group.matcher !== ""
            ? group.matcher
            : "(all)";
        const hooksList = Array.isArray(group.hooks) ? group.hooks : [];
        for (const hook of hooksList) {
          if (typeof hook !== "object" || hook === null) continue;
          const h = hook as Record<string, unknown>;
          const command = typeof h.command === "string" ? h.command : null;
          if (!command) continue;
          const rawPath = extractBunFilePath(command);
          if (!rawPath) continue;
          const filePath = expandHome(rawPath);
          entries.push({
            phase,
            matcher,
            filePath,
            exists: fs.existsSync(filePath),
          });
        }
      }
    }
  }

  const statusLine = settings.statusLine as Record<string, unknown> | undefined;
  if (statusLine && typeof statusLine === "object") {
    const command =
      typeof statusLine.command === "string" ? statusLine.command : null;
    if (command) {
      const rawPath = extractBunFilePath(command);
      if (rawPath) {
        const filePath = expandHome(rawPath);
        entries.push({
          phase: "statusLine",
          matcher: "-",
          filePath,
          exists: fs.existsSync(filePath),
        });
      }
    }
  }

  return entries;
}

function validateHooks(): void {
  const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
  console.log(
    `\n[validate-hooks] Checking hooks in ~/.claude/settings.json...\n`,
  );

  if (!fs.existsSync(settingsPath)) {
    console.log(`❌ Not found: ${settingsPath}`);
    process.exit(1);
  }

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch {
    console.log(`❌ Error parsing settings.json`);
    process.exit(1);
  }

  const entries = collectHookEntries(settings);

  if (entries.length === 0) {
    console.log("  No hooks with bun commands found in settings.json");
    process.exit(0);
  }

  // Column widths
  const colPhase = Math.max(
    "Phase".length,
    ...entries.map((e) => e.phase.length),
  );
  const colMatcher = Math.max(
    "Matcher".length,
    ...entries.map((e) => e.matcher.length),
  );
  const colPath = Math.max(
    "Path".length,
    ...entries.map((e) => e.filePath.length),
  );

  const pad = (s: string, n: number) => s.padEnd(n);

  console.log(
    `  ${pad("Phase", colPhase)}  ${pad("Matcher", colMatcher)}  ${pad("Path", colPath)}  Exists`,
  );
  console.log(
    `  ${"─".repeat(colPhase)}  ${"─".repeat(colMatcher)}  ${"─".repeat(colPath)}  ${"─".repeat(6)}`,
  );

  for (const e of entries) {
    const icon = e.exists ? "✓" : "✗";
    console.log(
      `  ${pad(e.phase, colPhase)}  ${pad(e.matcher, colMatcher)}  ${pad(e.filePath, colPath)}  ${icon}`,
    );
  }

  const ok = entries.filter((e) => e.exists).length;
  const total = entries.length;
  const missing = total - ok;

  console.log("");
  if (missing === 0) {
    console.log(`  Result: ${ok}/${total} hooks OK ✓`);
    process.exit(0);
  } else {
    console.log(`  Result: ${missing} hooks MISSING (${ok}/${total} OK)`);
    process.exit(1);
  }
}

// === CONFIRMATION ===

async function askConfirmation(message: string): Promise<boolean> {
  const rl = await import("readline");
  const readline = rl.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(`\n${message} (y/N): `, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// === MAIN ===

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      execute: { type: "boolean", default: false },
      backup: { type: "boolean", default: false },
      unlink: { type: "boolean", default: false },
      status: { type: "boolean", default: false },
      check: { type: "boolean", default: false },
      "validate-hooks": { type: "boolean", default: false },
      force: { type: "boolean", short: "f", default: false },
      method: { type: "string", default: "auto" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(`
sync-claude - Syncs .claude/ from poneglyph to ~/.claude/ via symlinks

Usage:
  bun run scripts/sync-claude.ts [options]

Options:
  --check           Verify system and permissions (recommended first)
  --status          Show current state of ~/.claude
  --validate-hooks  Verify all hooks in settings.json are accessible
  --execute         Create the symlinks (without this only shows preview)
  --backup          Save existing content before replacing
  --unlink          Remove the symlinks (does not delete the source)
  --method          Link method: auto, symlink, junction, copy
  --force           Do not ask for confirmation
  -h, --help        Show this help

Link methods:
  auto        Detects the best available method (default)
  symlink     Real symlinks (requires permissions on Windows)
  junction    Windows junctions (folders only, no special permissions)
  copy        Copies files (does not sync changes)

Examples:
  bun run scripts/sync-claude.ts --check           # Verify system first
  bun run scripts/sync-claude.ts                   # Preview
  bun run scripts/sync-claude.ts --status          # See current state
  bun run scripts/sync-claude.ts --execute         # Create symlinks
  bun run scripts/sync-claude.ts --execute --backup  # With backup
  bun run scripts/sync-claude.ts --method junction --execute  # Force junction
  bun run scripts/sync-claude.ts --unlink          # Remove symlinks
  bun run scripts/sync-claude.ts --validate-hooks  # Verify hook accessibility

Requirements per OS:
  Windows:  Developer Mode enabled, or use junction, or Admin
  macOS:    Normal user permissions
  Linux:    Normal user permissions
`);
    return;
  }

  const config: Config = {
    execute: values.execute ?? false,
    backup: values.backup ?? false,
    unlink: values.unlink ?? false,
    status: values.status ?? false,
    check: values.check ?? false,
    validateHooks: values["validate-hooks"] ?? false,
    force: values.force ?? false,
    method: (values.method as Config["method"]) ?? "auto",
  };

  // Non-interactive guard: askConfirmation() blocks forever without a TTY (e.g.
  // launched by an agent or in CI), which reads as "the command failed". Fail
  // fast with guidance instead of hanging.
  if (
    (config.execute || config.unlink) &&
    !config.force &&
    !process.stdin.isTTY
  ) {
    console.error(
      "\n❌ No interactive terminal and --force not set — this would hang on the\n" +
        "   confirmation prompt. Re-run non-interactively with --force:\n" +
        "     bun .claude/commands/sync-claude.ts --execute --backup --force\n",
    );
    process.exit(2);
  }

  const projectRoot = getProjectRoot();
  const homeDir = getHomeDir();

  console.log(`\n🔧 Sync Claude Config`);
  console.log(`   Source:  ${path.join(projectRoot, ".claude")}`);
  console.log(`   Target:  ${path.join(homeDir, ".claude")}`);

  // Get system info
  const systemInfo = await getSystemInfo();

  // --check: only show system info
  if (config.check) {
    printSystemInfo(systemInfo);

    const canLink = systemInfo.canSymlink || systemInfo.canJunction;
    if (canLink) {
      console.log("\n✅ System ready for sync");
      console.log("   Run without --check to see preview of changes");
    } else {
      console.log("\n❌ System CANNOT create links");
      console.log("   Review the recommendations above");
    }
    return;
  }

  if (config.validateHooks) {
    validateHooks();
    return;
  }

  const links = detectLinks(projectRoot, homeDir);

  if (config.status) {
    printStatus(links);
    return;
  }

  if (config.unlink) {
    if (!config.force) {
      const confirmed = await askConfirmation("Remove all symlinks?");
      if (!confirmed) {
        console.log("❌ Cancelled");
        return;
      }
    }
    unlinkAll(links);
    console.log("\n✅ Symlinks removed");
    return;
  }

  // Check capability before continuing
  const canLink = systemInfo.canSymlink || systemInfo.canJunction;
  if (!canLink && config.method !== "copy") {
    console.log("\n⚠️  Cannot create symlinks/junctions on this system");
    printSystemInfo(systemInfo);
    console.log("\n💡 Options:");
    console.log("   1. Follow the recommendations above");
    console.log("   2. Use --method copy to copy (does not sync changes)");
    return;
  }

  const method = determineLinkMethod(systemInfo, config);
  printPreview(links, method);

  // settings.json is generated (merged), not linked — preview it alongside.
  const settingsPreview = generateSettings(projectRoot, homeDir, {
    ...config,
    execute: false,
  });
  console.log(
    `\n⚙️  settings.json (generated real file, not linked): ${settingsPreview.message}`,
  );

  if (!config.execute) {
    console.log("\n💡 Use --execute to create the symlinks");
    console.log("   Use --backup to save existing content");
    console.log("   Use --check to verify system permissions");
    return;
  }

  const toModify = links.filter((l) => l.status !== "already-linked");

  if (!config.force) {
    const hasExisting = links.some(
      (l) => l.status === "exists" || l.status === "conflict",
    );
    const message = hasExisting
      ? `Create ${toModify.length} links + regenerate settings.json? (existing content will be replaced${config.backup ? ", with backup" : ""})`
      : `Create ${toModify.length} links + regenerate settings.json?`;

    const confirmed = await askConfirmation(message);
    if (!confirmed) {
      console.log("❌ Cancelled");
      return;
    }
  }

  if (toModify.length > 0) {
    await createSymlinks(links, config, systemInfo);
  } else {
    console.log("\n✅ All symlinks already linked correctly");
  }

  // Always (re)generate the merged settings.json — per-machine, never symlinked.
  const settingsResult = generateSettings(projectRoot, homeDir, config);
  const sIcon =
    settingsResult.status === "written"
      ? "⚙️ "
      : settingsResult.status === "error"
        ? "❌"
        : "📄";
  console.log(`${sIcon} settings.json: ${settingsResult.message}`);

  console.log("\n✅ Sync completed");

  if (config.backup) {
    console.log(`💾 Backup saved in ~/.claude.backup/`);
  }

  // Verify result
  console.log("\n📋 Final verification:");
  const updatedLinks = detectLinks(projectRoot, homeDir);
  const successCount = updatedLinks.filter(
    (l) => l.status === "already-linked",
  ).length;
  console.log(
    `   ${successCount}/${updatedLinks.length} folders linked correctly`,
  );
}

main().catch(console.error);

#!/usr/bin/env bun
// scripts/sync-claude.ts
// Sincroniza .claude/ de poneglyph a ~/.claude/ via symlinks
// Soporta: Windows (junction/symlink), macOS, Linux

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { parseArgs } from "util";
import { $ } from "bun";

// === CONFIGURACIÓN ===

const LINK_FOLDERS = [
  "agents",
  "skills",
  "commands",
  "rules",
  "docs",
  "hooks",
  "workflows",
  "orchestrator",
  "knowledge",
];

const LINK_FILES = [{ src: "CLAUDE.md", dest: "CLAUDE.md" }];

// === TIPOS ===

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

// === DETECCIÓN DE SISTEMA ===

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
  // Verificar si es admin
  try {
    const result = await $`net session 2>&1`.quiet().nothrow();
    info.isAdmin = result.exitCode === 0;
  } catch {
    info.isAdmin = false;
  }

  // Verificar Developer Mode (Windows 10+)
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

  // Test de symlink real
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

  // Test de junction (siempre funciona en Windows sin permisos especiales)
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

  // Recomendaciones
  if (!info.canSymlink && !info.devModeEnabled) {
    info.recommendations.push(
      "🔧 Activar Developer Mode para symlinks:",
      "   Settings → Privacy & Security → For developers → Developer Mode: ON",
      "   O ejecutar como Administrador",
    );
  }

  if (!info.canSymlink && info.canJunction) {
    info.recommendations.push(
      "💡 Se usarán junctions (funcionan sin permisos especiales)",
      "   Las junctions son equivalentes a symlinks para carpetas",
    );
  }
}

async function checkUnixCapabilities(info: SystemInfo): Promise<void> {
  // En Unix, symlinks siempre funcionan para el usuario
  info.canSymlink = true;
  info.canJunction = false; // No existe en Unix

  // Verificar si es root
  info.isAdmin = process.getuid?.() === 0;

  // Verificar permisos en home
  try {
    const testFile = path.join(info.homeDir, `.symlink-test-${Date.now()}`);
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
  } catch {
    info.recommendations.push(
      "⚠️ No tienes permisos de escritura en tu home directory",
      `   Verifica permisos de: ${info.homeDir}`,
    );
    info.canSymlink = false;
  }

  // macOS específico
  if (info.os === "macos") {
    // Verificar SIP si es relevante
    try {
      const result = await $`csrutil status 2>&1`.quiet().nothrow();
      const output = result.stdout.toString();
      if (output.includes("enabled")) {
        info.recommendations.push(
          "ℹ️ SIP está habilitado (normal, no afecta ~/.claude)",
        );
      }
    } catch {}
  }
}

function printSystemInfo(info: SystemInfo): void {
  console.log("\n🖥️  Información del Sistema:\n");

  const osNames: Record<string, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
    unknown: "Desconocido",
  };

  console.log(`   OS:              ${osNames[info.os]} ${info.osVersion}`);
  console.log(`   Home:            ${info.homeDir}`);
  console.log(`   Shell:           ${info.shell}`);
  console.log(`   Admin/Root:      ${info.isAdmin ? "✅ Sí" : "❌ No"}`);

  if (info.os === "windows") {
    console.log(
      `   Developer Mode:  ${info.devModeEnabled === true ? "✅ Activado" : info.devModeEnabled === false ? "❌ Desactivado" : "❓ No detectado"}`,
    );
    console.log(
      `   Symlinks:        ${info.canSymlink ? "✅ Disponible" : "❌ No disponible"}`,
    );
    console.log(
      `   Junctions:       ${info.canJunction ? "✅ Disponible" : "❌ No disponible"}`,
    );
  } else {
    console.log(
      `   Symlinks:        ${info.canSymlink ? "✅ Disponible" : "❌ No disponible"}`,
    );
  }

  // Capacidad final
  const canLink = info.canSymlink || info.canJunction;
  console.log(`\n   Puede vincular:  ${canLink ? "✅ SÍ" : "❌ NO"}`);

  if (info.recommendations.length > 0) {
    console.log("\n📋 Recomendaciones:\n");
    info.recommendations.forEach((r) => console.log(`   ${r}`));
  }
}

// === UTILIDADES ===

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

// === DETECCIÓN DE LINKS ===

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

  return links;
}

// === PREVIEW ===

function printPreview(links: LinkInfo[], method: string): void {
  console.log("\n📋 Preview de symlinks:\n");
  console.log(`   Método: ${method}\n`);

  const grouped = {
    new: links.filter((l) => l.status === "new"),
    exists: links.filter((l) => l.status === "exists"),
    conflict: links.filter((l) => l.status === "conflict"),
    linked: links.filter((l) => l.status === "already-linked"),
  };

  if (grouped.linked.length) {
    console.log("✅ Ya vinculados:");
    grouped.linked.forEach((l) =>
      console.log(`   ${path.basename(l.dest)} → ${l.source}`),
    );
  }

  if (grouped.new.length) {
    console.log("\n🆕 Nuevos (se crearán):");
    grouped.new.forEach((l) =>
      console.log(`   + ${path.basename(l.dest)} → ${l.source}`),
    );
  }

  if (grouped.exists.length) {
    console.log("\n⚠️  Existentes (se reemplazarán con --backup):");
    grouped.exists.forEach((l) => console.log(`   ~ ${l.dest}`));
  }

  if (grouped.conflict.length) {
    console.log("\n❌ Conflictos (symlink apunta a otro lugar):");
    grouped.conflict.forEach((l) => {
      const target = getSymlinkTarget(l.dest);
      console.log(`   ! ${l.dest} → ${target}`);
    });
  }

  const toCreate =
    grouped.new.length + grouped.exists.length + grouped.conflict.length;
  console.log(
    `\n📊 Resumen: ${grouped.linked.length} ya vinculados, ${toCreate} por crear/actualizar`,
  );
}

// === CREACIÓN DE SYMLINKS ===

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
    console.log(`📁 Creado ${destBase}`);
  }

  console.log(`\n🔗 Método de vinculación: ${method}\n`);

  for (const link of links) {
    if (link.status === "already-linked") {
      console.log(`⏭️  Saltando ${path.basename(link.dest)} (ya vinculado)`);
      continue;
    }

    // Backup si existe
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

    // Eliminar existente
    if (fs.existsSync(link.dest) || isSymlink(link.dest)) {
      if (isSymlink(link.dest)) {
        fs.unlinkSync(link.dest);
      } else if (!config.backup) {
        fs.rmSync(link.dest, { recursive: true, force: true });
      }
    }

    // Crear vínculo según método
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
            // Junction no soporta archivos, usar hardlink o copy
            fs.copyFileSync(link.source, link.dest);
            console.log(`   ⚠️ Archivo copiado (junction no soporta archivos)`);
          }
          break;

        case "copy":
          if (link.type === "directory") {
            fs.cpSync(link.source, link.dest, { recursive: true });
          } else {
            fs.copyFileSync(link.source, link.dest);
          }
          console.log(
            `   ⚠️ Copiado (no vinculado - cambios no se sincronizarán)`,
          );
          break;
      }

      const icon = method === "copy" ? "📄" : "🔗";
      console.log(
        `${icon} Creado: ${path.basename(link.dest)} → ${link.source}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("EPERM")) {
          console.error(
            `❌ Error de permisos creando ${path.basename(link.dest)}`,
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
    console.log("\n💡 Soluciones para Windows:");
    console.log("   1. Activar Developer Mode:");
    console.log(
      "      Settings → Privacy & Security → For developers → Developer Mode: ON",
    );
    console.log("   2. O ejecutar terminal como Administrador");
    console.log(
      "   3. O usar --method junction (no requiere permisos especiales)",
    );
  } else if (info.os === "macos") {
    console.log("\n💡 Soluciones para macOS:");
    console.log("   1. Verificar permisos de tu home: ls -la ~");
    console.log("   2. Si usas FileVault, asegurar que está desbloqueado");
  } else {
    console.log("\n💡 Soluciones para Linux:");
    console.log("   1. Verificar permisos: ls -la ~/.claude");
    console.log("   2. Si es necesario: sudo chown -R $USER ~/.claude");
  }
}

// === UNLINK ===

function unlinkAll(links: LinkInfo[]): void {
  for (const link of links) {
    if (isSymlink(link.dest)) {
      fs.unlinkSync(link.dest);
      console.log(`🗑️  Eliminado symlink: ${link.dest}`);
    }
  }
}

// === STATUS ===

function printStatus(links: LinkInfo[]): void {
  console.log("\n📊 Estado actual de ~/.claude:\n");

  const homeDir = getHomeDir();
  const destBase = path.join(homeDir, ".claude");

  if (!fs.existsSync(destBase)) {
    console.log("❌ ~/.claude no existe");
    return;
  }

  for (const link of links) {
    const exists = fs.existsSync(link.dest) || isSymlink(link.dest);
    const isLink = isSymlink(link.dest);
    const target = isLink ? getSymlinkTarget(link.dest) : null;

    if (!exists) {
      console.log(`⚪ ${path.basename(link.dest)}: no existe`);
    } else if (isLink) {
      const resolvedTarget = target
        ? path.resolve(path.dirname(link.dest), target)
        : null;
      const pointsToProject =
        normalizePath(target || "") === normalizePath(link.source) ||
        normalizePath(resolvedTarget || "") === normalizePath(link.source);

      if (pointsToProject) {
        console.log(`🟢 ${path.basename(link.dest)}: ✓ vinculado a poneglyph`);
      } else {
        console.log(`🟡 ${path.basename(link.dest)}: symlink a ${target}`);
      }
    } else {
      console.log(`🔵 ${path.basename(link.dest)}: carpeta/archivo local`);
    }
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
    `\n[validate-hooks] Verificando hooks en ~/.claude/settings.json...\n`,
  );

  if (!fs.existsSync(settingsPath)) {
    console.log(`❌ No se encontró: ${settingsPath}`);
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
    console.log("  No se encontraron hooks con comandos bun en settings.json");
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

// === CONFIRMACIÓN ===

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
sync-claude - Sincroniza .claude/ de poneglyph a ~/.claude/ via symlinks

Uso:
  bun run scripts/sync-claude.ts [opciones]

Opciones:
  --check           Verificar sistema y permisos (recomendado primero)
  --status          Muestra estado actual de ~/.claude
  --validate-hooks  Verifica que todos los hooks de settings.json son accesibles
  --execute         Crea los symlinks (sin esto solo muestra preview)
  --backup          Guarda contenido existente antes de reemplazar
  --unlink          Elimina los symlinks (no borra el origen)
  --method          Método de vinculación: auto, symlink, junction, copy
  --force           No pedir confirmación
  -h, --help        Muestra esta ayuda

Métodos de vinculación:
  auto        Detecta el mejor método disponible (default)
  symlink     Symlinks reales (requiere permisos en Windows)
  junction    Junctions de Windows (solo carpetas, sin permisos especiales)
  copy        Copia archivos (no sincroniza cambios)

Ejemplos:
  bun run scripts/sync-claude.ts --check           # Verificar sistema primero
  bun run scripts/sync-claude.ts                   # Preview
  bun run scripts/sync-claude.ts --status          # Ver estado actual
  bun run scripts/sync-claude.ts --execute         # Crear symlinks
  bun run scripts/sync-claude.ts --execute --backup  # Con backup
  bun run scripts/sync-claude.ts --method junction --execute  # Forzar junction
  bun run scripts/sync-claude.ts --unlink          # Eliminar symlinks
  bun run scripts/sync-claude.ts --validate-hooks  # Verificar accesibilidad de hooks

Requisitos por SO:
  Windows:  Developer Mode activado, o usar junction, o Admin
  macOS:    Permisos normales de usuario
  Linux:    Permisos normales de usuario
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

  const projectRoot = getProjectRoot();
  const homeDir = getHomeDir();

  console.log(`\n🔧 Sync Claude Config`);
  console.log(`   Origen:  ${path.join(projectRoot, ".claude")}`);
  console.log(`   Destino: ${path.join(homeDir, ".claude")}`);

  // Obtener info del sistema
  const systemInfo = await getSystemInfo();

  // --check: solo mostrar info del sistema
  if (config.check) {
    printSystemInfo(systemInfo);

    const canLink = systemInfo.canSymlink || systemInfo.canJunction;
    if (canLink) {
      console.log("\n✅ Sistema listo para sincronización");
      console.log("   Ejecuta sin --check para ver preview de cambios");
    } else {
      console.log("\n❌ Sistema NO puede crear vínculos");
      console.log("   Revisa las recomendaciones arriba");
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
      const confirmed = await askConfirmation("¿Eliminar todos los symlinks?");
      if (!confirmed) {
        console.log("❌ Cancelado");
        return;
      }
    }
    unlinkAll(links);
    console.log("\n✅ Symlinks eliminados");
    return;
  }

  // Verificar capacidad antes de continuar
  const canLink = systemInfo.canSymlink || systemInfo.canJunction;
  if (!canLink && config.method !== "copy") {
    console.log("\n⚠️  No se pueden crear symlinks/junctions en este sistema");
    printSystemInfo(systemInfo);
    console.log("\n💡 Opciones:");
    console.log("   1. Sigue las recomendaciones arriba");
    console.log("   2. Usa --method copy para copiar (no sincroniza cambios)");
    return;
  }

  const method = determineLinkMethod(systemInfo, config);
  printPreview(links, method);

  if (!config.execute) {
    console.log("\n💡 Usa --execute para crear los symlinks");
    console.log("   Usa --backup para guardar contenido existente");
    console.log("   Usa --check para verificar permisos del sistema");
    return;
  }

  const toModify = links.filter((l) => l.status !== "already-linked");
  if (toModify.length === 0) {
    console.log("\n✅ Todo ya está vinculado correctamente");
    return;
  }

  if (!config.force) {
    const hasExisting = links.some(
      (l) => l.status === "exists" || l.status === "conflict",
    );
    const message = hasExisting
      ? `¿Crear ${toModify.length} vínculos? (se reemplazará contenido existente${config.backup ? ", con backup" : ""})`
      : `¿Crear ${toModify.length} vínculos?`;

    const confirmed = await askConfirmation(message);
    if (!confirmed) {
      console.log("❌ Cancelado");
      return;
    }
  }

  await createSymlinks(links, config, systemInfo);
  console.log("\n✅ Sincronización completada");

  if (config.backup) {
    console.log(`💾 Backup guardado en ~/.claude.backup/`);
  }

  // Verificar resultado
  console.log("\n📋 Verificación final:");
  const updatedLinks = detectLinks(projectRoot, homeDir);
  const successCount = updatedLinks.filter(
    (l) => l.status === "already-linked",
  ).length;
  console.log(
    `   ${successCount}/${updatedLinks.length} carpetas vinculadas correctamente`,
  );
}

main().catch(console.error);

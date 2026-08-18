#!/usr/bin/env bun
// sync-orca — verifies that Orca launches its Claude agent with the poneglyph
// system prompt appended (plan: indexed-nebula, Fase 3).
//
// Orca's installed-agents config (Comando/Argumentos per agent) is UI-only: the
// orca CLI exposes worktrees/terminals/automations/browser but NOT app settings
// (verified against `orca skills get orca-cli`, 2026-08-18). So this script can
// not APPLY the change — it VERIFIES it and prints the exact string to paste
// once in the UI when missing. Idempotent: run it any time.
//
//   bun .claude/scripts/sync-orca.ts             # verify
//   bun .claude/scripts/sync-orca.ts --verbose   # also list matched files
//
// Exit codes: 0 = configured · 1 = missing/mismatch · 2 = environment problem.

import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const SP_FILE = join(import.meta.dir, "..", "system-prompts", "poneglyph-sp.md");
const FLAG = "--append-system-prompt-file";
const EXPECTED = `${FLAG} ${SP_FILE}`;

// App-storage areas that legitimately hold settings. Caches and terminal
// transcripts are excluded — a spawned `claude --append-system-prompt-file`
// command echoed in terminal-history would false-positive the check
// (lesson: feedback-discriminating-greps).
const EXCLUDE_DIRS = new Set([
  "terminal-history",
  "Cache",
  "Code Cache",
  "GPUCache",
  "DawnGraphiteCache",
  "DawnWebGPUCache",
  "blob_storage",
  "logs",
  "Crashpad",
  "codex-runtime-home",
  "codex-session-backfill",
  "cookie-import-staging",
]);
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function orcaConfigDirs(plat: string = platform(), home: string = homedir(), appData?: string): string[] {
  const dirs: string[] = [];
  if (plat === "darwin") dirs.push(join(home, "Library", "Application Support", "orca"));
  else if (plat === "win32" && appData) dirs.push(join(appData, "orca"));
  else dirs.push(join(home, ".config", "orca"));
  dirs.push(join(home, ".orca"));
  return dirs;
}

interface ScanHit {
  file: string;
  exact: boolean; // matched the full expected "flag + path", not just the bare flag
}

export function scanDir(root: string, expected: string, flag: string): ScanHit[] {
  const hits: ScanHit[] = [];
  const expectedBuf = Buffer.from(expected);
  const flagBuf = Buffer.from(flag);
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (EXCLUDE_DIRS.has(name)) continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile() && st.size > 0 && st.size <= MAX_FILE_BYTES) {
        let buf: Buffer;
        try {
          buf = readFileSync(full);
        } catch {
          continue;
        }
        if (buf.includes(expectedBuf)) hits.push({ file: full, exact: true });
        else if (buf.includes(flagBuf)) hits.push({ file: full, exact: false });
      }
    }
  };
  walk(root);
  return hits;
}

if (import.meta.main) {
  const verbose = process.argv.includes("--verbose");

  if (!existsSync(SP_FILE)) {
    console.log(`🔴 SP file missing: ${SP_FILE}`);
    process.exit(2);
  }

  const dirs = orcaConfigDirs(platform(), homedir(), process.env.APPDATA).filter(existsSync);
  if (dirs.length === 0) {
    console.log("🔴 No Orca config dir found on this machine — is Orca installed?");
    process.exit(2);
  }

  const hits = dirs.flatMap((d) => scanDir(d, EXPECTED, FLAG));

  // Decision 2026-08-18 (evidence dossier, plan indexed-nebula): Orca-spawned
  // claude sessions already load the Poneglyph outputStyle via ~/.claude/settings.json,
  // and style adherence >= append (maintainer ranking + probe battery 4/4 both sides;
  // dupe battery: double-load innocuous but useless, ~10K extra input/session).
  // Expected state is therefore NO append in Orca's agent Argumentos.
  if (hits.length === 0) {
    console.log("🟢 Orca: correcto — sin append configurado. Las sesiones heredan el outputStyle vía settings.");
    console.log("   (Cinturón opcional si algún día el style falla: añade a Argumentos del agente Claude:");
    console.log(`    ${EXPECTED})`);
    process.exit(0);
  }

  console.log("🟡 Orca: hay un --append-system-prompt configurado en la app — doble carga con el outputStyle.");
  console.log("   Medido 2026-08-18: inocua pero inútil (~10K input extra por sesión). Recomendado: quitarlo.");
  for (const h of hits) console.log(`   ${h.exact ? "(SP poneglyph)" : "(otra ruta)"} ${h.file}`);
  if (verbose) console.log(`\nRuta del SP: ${SP_FILE}`);
  process.exit(0);
}

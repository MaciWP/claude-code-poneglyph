import {
  statSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";

export interface ContextEntry {
  filePath: string;
  readAt: number;
  mtime: number;
}

export interface StalenessResult {
  isStale: boolean;
  filePath: string;
  readAt: number;
  readMtime: number;
  currentMtime: number;
  message: string;
}

const REGISTRY_PATH = join(homedir(), ".claude", ".context-registry.json");

export class ContextRegistry {
  private entries: Map<string, ContextEntry> = new Map();

  constructor() {
    this.load();
  }

  record(filePath: string): void {
    const normalized = this.normalize(filePath);
    try {
      const stat = statSync(normalized);
      this.entries.set(normalized, {
        filePath: normalized,
        readAt: Date.now(),
        mtime: stat.mtimeMs,
      });
      this.save();
    } catch {
      // File might not exist yet
    }
  }

  check(filePath: string): StalenessResult {
    const normalized = this.normalize(filePath);
    const entry = this.entries.get(normalized);

    if (!entry) {
      return {
        isStale: true,
        filePath: normalized,
        readAt: 0,
        readMtime: 0,
        currentMtime: 0,
        message: `File "${normalized}" was never read in this session. Read it first before editing.`,
      };
    }

    try {
      const stat = statSync(normalized);
      const currentMtime = stat.mtimeMs;

      if (currentMtime !== entry.mtime) {
        return {
          isStale: true,
          filePath: normalized,
          readAt: entry.readAt,
          readMtime: entry.mtime,
          currentMtime,
          message: `File "${normalized}" changed since last read (read at ${new Date(entry.readAt).toISOString()}, mtime changed from ${entry.mtime} to ${currentMtime}). Re-read before editing.`,
        };
      }

      return {
        isStale: false,
        filePath: normalized,
        readAt: entry.readAt,
        readMtime: entry.mtime,
        currentMtime,
        message: "File is fresh.",
      };
    } catch {
      return {
        isStale: true,
        filePath: normalized,
        readAt: entry.readAt,
        readMtime: entry.mtime,
        currentMtime: 0,
        message: `File "${normalized}" no longer exists on disk.`,
      };
    }
  }

  update(filePath: string): void {
    const normalized = this.normalize(filePath);
    try {
      const stat = statSync(normalized);
      const existing = this.entries.get(normalized);
      this.entries.set(normalized, {
        filePath: normalized,
        readAt: existing ? existing.readAt : Date.now(),
        mtime: stat.mtimeMs,
      });
      this.save();
    } catch {
      // File might not exist
    }
  }

  invalidate(filePath: string): void {
    const normalized = this.normalize(filePath);
    this.entries.delete(normalized);
    this.save();
  }

  clear(): void {
    this.entries.clear();
    this.save();
  }

  getAll(): ContextEntry[] {
    return Array.from(this.entries.values());
  }

  get size(): number {
    return this.entries.size;
  }

  private normalize(filePath: string): string {
    return filePath.replace(/\\/g, "/");
  }

  private load(): void {
    try {
      if (existsSync(REGISTRY_PATH)) {
        const raw = readFileSync(REGISTRY_PATH, "utf-8");
        const data = JSON.parse(raw) as ContextEntry[];
        for (const entry of data) {
          this.entries.set(entry.filePath, entry);
        }
      }
    } catch {
      this.entries.clear();
    }
  }

  private save(): void {
    try {
      const dir = join(homedir(), ".claude");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        REGISTRY_PATH,
        JSON.stringify(Array.from(this.entries.values()), null, 2),
      );
    } catch {
      // Best effort
    }
  }
}

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const DEFAULT_ARTIFACTS = ["CLAUDE.md", "package.json", "pyproject.toml", "requirements.txt"];

interface StalenessConfig {
  artifacts: string[];
}

function loadStalenessConfig(projectRoot: string): StalenessConfig {
  const p = join(projectRoot, ".claude", "staleness-config.json");
  try {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf-8")) as StalenessConfig;
    }
  } catch {
    // ignore
  }
  return { artifacts: DEFAULT_ARTIFACTS };
}

export async function computeProjectHash(projectRoot: string): Promise<string> {
  const { artifacts } = loadStalenessConfig(projectRoot);
  const contents = await Promise.all(
    artifacts.map((f) =>
      readFile(join(projectRoot, f), "utf-8").catch(() => ""),
    ),
  );
  return createHash("sha256").update(contents.join("|")).digest("hex").slice(0, 12);
}

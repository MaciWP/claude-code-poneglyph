import {
  Project,
  ScriptTarget,
  ModuleKind,
  ModuleResolutionKind,
} from "ts-morph";
import type { SourceFile } from "ts-morph";
import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";

const projectCache = new Map<string, Project>();

function findNearestTsconfig(startDir: string): string | null {
  let current = resolve(startDir);
  const root = resolve("/");

  while (current !== root) {
    const candidate = join(current, "tsconfig.json");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return null;
}

function createDefaultProject(): Project {
  return new Project({
    compilerOptions: {
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.Bundler,
      strict: true,
      skipLibCheck: true,
    },
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });
}

export function getOrCreateProject(filePath: string): Project {
  const dir = dirname(resolve(filePath));
  const tsconfigPath = findNearestTsconfig(dir);
  const cacheKey = tsconfigPath ?? "__default__";

  const cached = projectCache.get(cacheKey);
  if (cached) return cached;

  let project: Project;
  if (tsconfigPath) {
    try {
      project = new Project({
        tsConfigFilePath: tsconfigPath,
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
      });
    } catch {
      project = createDefaultProject();
    }
  } else {
    project = createDefaultProject();
  }

  projectCache.set(cacheKey, project);
  return project;
}

export function addOrUpdateFile(
  project: Project,
  filePath: string,
  content: string,
): SourceFile {
  const resolved = resolve(filePath);
  const existing = project.getSourceFile(resolved);
  if (existing) {
    existing.replaceWithText(content);
    return existing;
  }
  return project.createSourceFile(resolved, content, { overwrite: true });
}

import type { SourceFile } from "ts-morph";
import type { Hallucination } from "../types";

function isBuiltinModule(specifier: string): boolean {
  return (
    specifier.startsWith("bun:") ||
    specifier.startsWith("node:") ||
    specifier === "bun"
  );
}

export function checkImports(sourceFile: SourceFile): Hallucination[] {
  const hallucinations: Hallucination[] = [];

  try {
    const imports = sourceFile.getImportDeclarations();

    for (const decl of imports) {
      try {
        const specifier = decl.getModuleSpecifierValue();

        if (isBuiltinModule(specifier)) continue;

        if (decl.isTypeOnly()) continue;

        if (specifier.startsWith("@types/")) continue;

        const resolved = decl.getModuleSpecifierSourceFile();
        if (!resolved) {
          const startLine = decl.getStartLineNumber();
          const startCol = decl.getStart() - (decl.getStartLinePos() ?? 0);
          hallucinations.push({
            type: "phantom_import",
            message: `Cannot find module '${specifier}'`,
            location: {
              file: sourceFile.getFilePath(),
              line: startLine,
              column: startCol + 1,
            },
            blocking: true,
          });
        }
      } catch {
        // skip individual import that fails
      }
    }
  } catch {
    // skip if import extraction fails entirely
  }

  return hallucinations;
}

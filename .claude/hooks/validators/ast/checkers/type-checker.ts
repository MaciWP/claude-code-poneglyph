import { SyntaxKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { Hallucination } from "../types";

const BUILTIN_TYPES = new Set([
  "string",
  "number",
  "boolean",
  "void",
  "null",
  "undefined",
  "never",
  "unknown",
  "any",
  "object",
  "symbol",
  "bigint",
  "Array",
  "Promise",
  "Record",
  "Partial",
  "Required",
  "Readonly",
  "Pick",
  "Omit",
  "Exclude",
  "Extract",
  "NonNullable",
  "ReturnType",
  "Parameters",
  "ConstructorParameters",
  "InstanceType",
  "ThisType",
  "Awaited",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "ReadonlyArray",
  "ReadonlyMap",
  "ReadonlySet",
  "RegExp",
  "Date",
  "Error",
  "TypeError",
  "RangeError",
  "JSON",
  "Function",
  "IterableIterator",
  "Iterator",
  "AsyncIterableIterator",
  "Generator",
  "AsyncGenerator",
]);

export function checkTypes(sourceFile: SourceFile): Hallucination[] {
  const hallucinations: Hallucination[] = [];

  try {
    const typeChecker = sourceFile.getProject().getTypeChecker();
    const typeRefs = sourceFile.getDescendantsOfKind(
      SyntaxKind.TypeReference,
    );

    for (const ref of typeRefs) {
      try {
        const typeName = ref.getTypeName();
        const name = typeName.getText();

        if (BUILTIN_TYPES.has(name)) continue;

        const tsType = typeChecker.compilerObject.getTypeAtLocation(
          ref.compilerNode,
        );

        if (!tsType) {
          hallucinations.push({
            type: "phantom_type",
            message: `Cannot find type '${name}'`,
            location: {
              file: sourceFile.getFilePath(),
              line: ref.getStartLineNumber(),
              column: 1,
            },
            blocking: false,
          });
          continue;
        }

        const flags = tsType.getFlags();
        const TS_ANY = 1;
        if (flags & TS_ANY) {
          const symbol = tsType.getSymbol();
          if (!symbol) {
            hallucinations.push({
              type: "phantom_type",
              message: `Cannot find type '${name}'`,
              location: {
                file: sourceFile.getFilePath(),
                line: ref.getStartLineNumber(),
                column: 1,
              },
              blocking: false,
            });
          }
        }
      } catch {
        // skip individual type reference
      }
    }
  } catch {
    // skip if type checking fails entirely
  }

  return hallucinations;
}

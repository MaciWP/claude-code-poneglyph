import { SyntaxKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { Hallucination } from "../types";

export function checkProperties(sourceFile: SourceFile): Hallucination[] {
  const hallucinations: Hallucination[] = [];

  try {
    const typeChecker = sourceFile.getProject().getTypeChecker();
    const propAccesses = sourceFile.getDescendantsOfKind(
      SyntaxKind.PropertyAccessExpression,
    );

    for (const access of propAccesses) {
      try {
        const propName = access.getName();
        const expression = access.getExpression();

        const exprType =
          typeChecker.compilerObject.getTypeAtLocation(
            expression.compilerNode,
          );

        if (!exprType) continue;

        const flags = exprType.getFlags();
        const TS_ANY = 1;
        const TS_UNKNOWN = 2;
        if (flags & TS_ANY || flags & TS_UNKNOWN) continue;

        const prop = exprType.getProperty(propName);
        if (!prop) {
          const symbol = exprType.getSymbol();
          const typeName = symbol?.getName() ?? "object";

          if (typeName === "__type" || typeName === "__object") continue;

          hallucinations.push({
            type: "phantom_property",
            message: `Property '${propName}' does not exist on type '${typeName}'`,
            location: {
              file: sourceFile.getFilePath(),
              line: access.getStartLineNumber(),
              column: 1,
            },
            blocking: false,
          });
        }
      } catch {
        // skip individual property access
      }
    }
  } catch {
    // skip if property checking fails entirely
  }

  return hallucinations;
}

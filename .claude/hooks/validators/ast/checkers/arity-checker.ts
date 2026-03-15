import { SyntaxKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { Hallucination } from "../types";

export function checkArity(sourceFile: SourceFile): Hallucination[] {
  const hallucinations: Hallucination[] = [];

  try {
    const typeChecker = sourceFile.getProject().getTypeChecker();
    const callExpressions = sourceFile.getDescendantsOfKind(
      SyntaxKind.CallExpression,
    );

    for (const call of callExpressions) {
      try {
        const tsCall = call.compilerNode;
        const signature = typeChecker.compilerObject.getResolvedSignature(
          tsCall as import("typescript").CallExpression,
        );

        if (!signature) continue;

        const params = signature.getParameters();
        const argCount = call.getArguments().length;

        let minParams = 0;
        let hasRest = false;

        for (const param of params) {
          const decl = param.getDeclarations()?.[0];
          if (!decl) {
            minParams++;
            continue;
          }

          const tsDecl = decl as import("typescript").ParameterDeclaration;
          if (tsDecl.dotDotDotToken) {
            hasRest = true;
            continue;
          }
          if (tsDecl.questionToken || tsDecl.initializer) {
            continue;
          }
          minParams++;
        }

        const maxParams = hasRest ? Infinity : params.length;

        if (argCount < minParams) {
          hallucinations.push({
            type: "wrong_arity",
            message: `Expected at least ${minParams} argument(s), but got ${argCount}`,
            location: {
              file: sourceFile.getFilePath(),
              line: call.getStartLineNumber(),
              column: 1,
            },
            blocking: false,
          });
        } else if (argCount > maxParams) {
          hallucinations.push({
            type: "wrong_arity",
            message: `Expected at most ${maxParams} argument(s), but got ${argCount}`,
            location: {
              file: sourceFile.getFilePath(),
              line: call.getStartLineNumber(),
              column: 1,
            },
            blocking: false,
          });
        }
      } catch {
        // skip individual call expression
      }
    }
  } catch {
    // skip if arity checking fails entirely
  }

  return hallucinations;
}

import { SyntaxKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { Hallucination } from "../types";

const GLOBAL_NAMES = new Set([
  "console",
  "process",
  "globalThis",
  "undefined",
  "NaN",
  "Infinity",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "encodeURI",
  "decodeURI",
  "encodeURIComponent",
  "decodeURIComponent",
  "JSON",
  "Math",
  "Date",
  "Array",
  "Object",
  "String",
  "Number",
  "Boolean",
  "Symbol",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Promise",
  "Proxy",
  "Reflect",
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "RegExp",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "fetch",
  "URL",
  "URLSearchParams",
  "Response",
  "Request",
  "Headers",
  "ReadableStream",
  "WritableStream",
  "TextEncoder",
  "TextDecoder",
  "AbortController",
  "AbortSignal",
  "crypto",
  "Bun",
  "Buffer",
  "Blob",
  "File",
  "FormData",
  "Event",
  "EventTarget",
  "queueMicrotask",
  "structuredClone",
  "atob",
  "btoa",
  "navigator",
  "performance",
  "require",
  "module",
  "exports",
  "__dirname",
  "__filename",
  "import",
]);

const DECLARATION_KINDS = new Set([
  SyntaxKind.ImportSpecifier,
  SyntaxKind.ImportClause,
  SyntaxKind.ImportDeclaration,
  SyntaxKind.ExportSpecifier,
  SyntaxKind.ExportDeclaration,
  SyntaxKind.VariableDeclaration,
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.EnumDeclaration,
  SyntaxKind.Parameter,
  SyntaxKind.PropertyDeclaration,
  SyntaxKind.PropertySignature,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.MethodSignature,
  SyntaxKind.PropertyAssignment,
  SyntaxKind.ShorthandPropertyAssignment,
  SyntaxKind.BindingElement,
  SyntaxKind.TypeParameter,
  SyntaxKind.EnumMember,
  SyntaxKind.LabeledStatement,
  SyntaxKind.BreakStatement,
  SyntaxKind.ContinueStatement,
  SyntaxKind.NamespaceImport,
]);

const MEMBER_ACCESS_KINDS = new Set([
  SyntaxKind.PropertyAccessExpression,
  SyntaxKind.QualifiedName,
]);

function isDeclarationContext(parentKind: SyntaxKind): boolean {
  return DECLARATION_KINDS.has(parentKind);
}

function isMemberAccessRightSide(
  parentKind: SyntaxKind,
  parent: { getExpression?: () => unknown; getLeft?: () => unknown },
  id: unknown,
): boolean {
  if (!MEMBER_ACCESS_KINDS.has(parentKind)) return false;
  const leftSide = parent.getExpression?.() ?? parent.getLeft?.();
  return leftSide !== id;
}

function shouldSkipIdentifier(name: string): boolean {
  return name.startsWith("_") || GLOBAL_NAMES.has(name);
}

export function checkSymbols(sourceFile: SourceFile): Hallucination[] {
  const hallucinations: Hallucination[] = [];

  try {
    const typeChecker = sourceFile.getProject().getTypeChecker();
    const identifiers = sourceFile.getDescendantsOfKind(
      SyntaxKind.Identifier,
    );

    for (const id of identifiers) {
      try {
        const name = id.getText();
        if (shouldSkipIdentifier(name)) continue;

        const parent = id.getParent();
        if (!parent) continue;

        const parentKind = parent.getKind();
        if (isDeclarationContext(parentKind)) continue;

        const parentAsAccess = parent as { getExpression?: () => unknown; getLeft?: () => unknown };
        if (isMemberAccessRightSide(parentKind, parentAsAccess, id)) continue;

        const symbol = typeChecker.compilerObject.getSymbolAtLocation(
          id.compilerNode,
        );

        if (!symbol) {
          hallucinations.push({
            type: "phantom_symbol",
            message: `Cannot find name '${name}'`,
            location: {
              file: sourceFile.getFilePath(),
              line: id.getStartLineNumber(),
              column:
                id.getStart() -
                sourceFile.getFullText().lastIndexOf("\n", id.getStart()),
            },
            blocking: true,
          });
        }
      } catch {
        // skip individual identifier
      }
    }
  } catch {
    // skip if symbol checking fails entirely
  }

  return hallucinations;
}

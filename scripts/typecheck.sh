#!/bin/bash
# TypeScript type checking for both packages

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔍 TypeScript Check"
echo "==================="

echo ""
echo "→ Checking server..."
cd "$ROOT_DIR/claude-code-ui/server"
bun tsc --noEmit
echo "  ✓ Server OK"

echo ""
echo "→ Checking web..."
cd "$ROOT_DIR/claude-code-ui/web"
bun tsc --noEmit
echo "  ✓ Web OK"

echo ""
echo "✅ TypeScript check passed!"

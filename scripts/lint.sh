#!/bin/bash
# ESLint for both packages

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Check for --fix flag
FIX_FLAG=""
if [[ "$1" == "--fix" ]]; then
  FIX_FLAG="--fix"
  echo "🔧 ESLint (with auto-fix)"
else
  echo "🔍 ESLint"
fi
echo "==================="

echo ""
echo "→ Linting server..."
cd "$ROOT_DIR/claude-code-ui/server"
bun eslint src $FIX_FLAG
echo "  ✓ Server OK"

echo ""
echo "→ Linting web..."
cd "$ROOT_DIR/claude-code-ui/web"
bun eslint src $FIX_FLAG
echo "  ✓ Web OK"

echo ""
echo "✅ Lint passed!"

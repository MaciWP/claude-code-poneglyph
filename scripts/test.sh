#!/bin/bash
# Run tests for both packages

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🧪 Tests"
echo "==================="

echo ""
echo "→ Testing server..."
cd "$ROOT_DIR/claude-code-ui/server"
bun test
echo "  ✓ Server tests passed"

echo ""
echo "→ Testing web..."
cd "$ROOT_DIR/claude-code-ui/web"
bun test
echo "  ✓ Web tests passed"

echo ""
echo "✅ All tests passed!"

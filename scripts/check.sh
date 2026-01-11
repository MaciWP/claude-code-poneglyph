#!/bin/bash
# Full quality check: typecheck + lint + test

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Running Full Quality Check"
echo "=============================="
echo ""

# TypeScript
"$SCRIPT_DIR/typecheck.sh"
echo ""

# Lint
"$SCRIPT_DIR/lint.sh"
echo ""

# Tests
"$SCRIPT_DIR/test.sh"
echo ""

echo "=============================="
echo "✅ All quality checks passed!"
echo "=============================="

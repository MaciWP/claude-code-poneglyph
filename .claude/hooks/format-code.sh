#!/bin/bash
# Post-edit hook: Format TypeScript/JavaScript code
# Runs after Edit|Write operations

FILE_PATH="${CLAUDE_FILE_PATH:-}"

# Format TypeScript/JavaScript files
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]] || [[ "$FILE_PATH" == *.js ]] || [[ "$FILE_PATH" == *.jsx ]]; then
    # Run eslint with autofix (if available)
    if command -v eslint &> /dev/null; then
        eslint --fix --quiet "$FILE_PATH" 2>/dev/null || true
    fi

    # Run prettier (if available)
    if command -v prettier &> /dev/null; then
        prettier --write --log-level silent "$FILE_PATH" 2>/dev/null || true
    fi
fi

# Always succeed - formatting errors shouldn't block edits
exit 0

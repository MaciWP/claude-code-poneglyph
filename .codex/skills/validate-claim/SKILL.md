---
name: validate-claim
description: Validate a file path or function name before making claims; use when unsure about file locations or function existence.
---

# Validate Claim

1. Use `Glob` or `rg --files` to confirm the file path.
2. If not found, search by filename and report suggestions.
3. If a function name is provided, `rg` for it in the resolved file.
4. Report confidence and whether to proceed, hedge, or ask the user.

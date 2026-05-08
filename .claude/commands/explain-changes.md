---
description: "Educational walkthrough of code changes (file/commit/branch/pending) with verification against official docs"
argument-hint: "[file | commit | branch | --pending (default)]"
---

# Explain Changes

The user wants an educational, professor-mode explanation of code changes.

**Target**: $ARGUMENTS

## Instructions

1. Invoke the `explain-changes` skill.
2. If `$ARGUMENTS` is empty, treat the target as `--pending` (working-tree changes) — see input-resolution rules in the skill.
3. Run the full workflow: resolve scope → identify changes → investigate context → verify (WebFetch when confidence < 70%) → compose professor-mode report → offer follow-up.
4. Do NOT modify any code — this skill is read-only.

If `$ARGUMENTS` is ambiguous (multiple file matches, ambiguous hash prefix, branch only on remote, etc.), STOP and ask the user to disambiguate before proceeding.

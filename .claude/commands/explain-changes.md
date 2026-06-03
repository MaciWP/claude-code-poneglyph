---
description: "Educational walkthrough of code changes (file/commit/branch/pending) with verification against official docs"
argument-hint: "[file | commit | branch | --pending (default)]"
---

$ARGUMENTS

Invoke the `explain-changes` skill. The skill owns ALL argument resolution — empty `$ARGUMENTS` → `--pending` (working tree), disambiguation on ambiguous targets, and the read-only constraint. Do not duplicate that logic here (single source of truth = the skill).

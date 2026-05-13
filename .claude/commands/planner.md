---
description: Adaptive planning protocol — Discovery, Research, Decomposition, Roadmap (Quick/Standard/Full levels)
argument-hint: "[--quick|--standard|--full] <task to plan>"
model: opus
version: 6.0.0
---

$ARGUMENTS

Invoke the `planner-protocol` skill and run the planning workflow with the task above. The skill triages level automatically (Quick / Standard / Full) based on complexity and scope; the optional flags `--quick`, `--standard`, `--full` force a specific level.

Full protocol (Discovery, Research, Gap Analysis, Task Classification, Execution Roadmap with DAGs, TDD, Validation) lives in `.claude/skills/planner-protocol/`. Previous inline manual was migrated in v6.0.0.

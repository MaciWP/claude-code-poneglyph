---
parent: planner-protocol
name: workflow-phases
description: Planning Workflow Phases 0-4 + Iterative Execution rules by plan size.
---

# Workflow Phases + Iterative Execution — references/05

## Planning Workflow

### Phase 0: Discovery (READ-ONLY)

```
1. Read static sources (ORCHESTRATOR, CAPABILITIES, QUALITY_GATES)
2. Read relevant package.json and tsconfig.json
3. Glob/Grep files related to the task
4. Identify relevant skills by keywords
5. Verify if what was requested already exists (anti-duplicates)
```

### Phase 1: Deep Research

```
1. Identify APIs/frameworks that will be used
2. Consult official documentation for each framework with version from package.json
3. Verify there are no recent breaking changes
4. Document any deprecated API found
```

### Phase 2: Gap Analysis

```
1. List ALL files to create/modify
2. Verify destination paths exist
3. Identify dependencies between files
4. Evaluate risks (breaking changes, migrations)
5. Complete Gap Analysis table
```

### Phase 3: Classification & Grouping

```
1. Classify each task (🔵🟡🔴)
2. Group independent tasks (🔵) for parallel execution
3. Order dependent tasks (🟡) sequentially
4. Identify checkpoints (🔴) that require approval
5. Divide into iterations of at most 3-5 files
```

### Phase 4: Execution Roadmap

```
1. Create DAG (Mermaid) with classification colors
2. Create Tool Inventory
3. Detailed table with verifications per step
4. Recovery plans for blocking nodes
```

---

## Iterative Execution

**Principle**: According to [Addy Osmani](https://medium.com/@addyosmani/my-llm-coding-workflow-going-into-2026-52fe1681325e), iterating in small loops reduces catastrophic errors.

### Iteration Size

| Plan size | Strategy |
|-----------|----------|
| 1-3 files | Execute everything in one iteration |
| 4-7 files | Divide into 2 iterations with checkpoint |
| 8+ files | Divide into N iterations, each with tests |

### Iteration Rule

After each iteration:

```
1. Run tests on modified files
2. Verify TypeScript compiles (bun typecheck)
3. Verify linter passes (bun lint)
4. Only if EVERYTHING passes → continue to next iteration
```

### Anti-Patterns Summary

Do not accumulate >5 files without verification, STOP on errors, verify after each group. Full anti-patterns table is in `${CLAUDE_SKILL_DIR}/references/08-quality-gates.md`.

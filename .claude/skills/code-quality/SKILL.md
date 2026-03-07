---
name: code-quality
description: "Skill de revision para calidad de codigo y mejores practicas.\nUse when reviewing: code smells, SOLID violations, complejidad, duplicacion.\nKeywords - code quality, code smells, SOLID, complexity, duplication, refactoring, clean code\n"
type: knowledge-base
disable-model-invocation: false
argument-hint: "[file-path or module]"
activation:
  keywords:
    - code quality
    - code smells
    - SOLID
    - complexity
    - duplication
    - refactoring
    - clean code
    - maintainability
for_agents: [reviewer]
version: "2.0"
---

# Code Quality Review

Code quality analysis patterns for TypeScript/Bun applications.

## When to Use

- General code review before merge
- Identifying code smells and anti-patterns
- Checking SOLID principle violations
- Measuring code complexity
- Finding duplicated code
- Refactoring planning / technical debt assessment

## Severity Levels

| Level | Definition | Examples |
|-------|------------|----------|
| Critical | Code is broken or will fail | Unreachable code, infinite loops, null dereference |
| High | Significant maintainability issue | God class, complexity > 15, duplicate code blocks |
| Medium | Noticeable code smell | Long methods, magic numbers, deep nesting |
| Low | Minor improvement opportunity | Naming, comments, organization |

## Review Process

1. **Scan** - Read through changed files, note structure and size
2. **Checklist** - Run through review checklist items (see reference)
3. **Red Flags** - Check for high-severity patterns
4. **Complexity** - Measure cyclomatic/cognitive complexity of key functions
5. **SOLID** - Check for principle violations
6. **Anti-Patterns** - Identify known anti-patterns
7. **Report** - Output findings using review template

## Reference Files

Load these on-demand for detailed guidance.

| Topic | File | Contents |
|-------|------|----------|
| Checklist | `${CLAUDE_SKILL_DIR}/references/review-checklist.md` | Naming, functions, classes, files, error handling, types |
| Red Flags | `${CLAUDE_SKILL_DIR}/references/red-flags.md` | Detection patterns table with severity |
| Common Issues | `${CLAUDE_SKILL_DIR}/references/common-issues.md` | 7 code smell patterns with before/after |
| SOLID | `${CLAUDE_SKILL_DIR}/references/solid-violations.md` | 5 SOLID violations with fixes |
| Complexity | `${CLAUDE_SKILL_DIR}/references/complexity-metrics.md` | Cyclomatic + cognitive complexity |
| Anti-Patterns | `${CLAUDE_SKILL_DIR}/references/anti-patterns-reference.md` | Anti-patterns table with detection |
| Output Template | `${CLAUDE_SKILL_DIR}/templates/review-template.md` | Review output format |

## Quick Thresholds

| Metric | OK | Warning | Fail |
|--------|-----|---------|------|
| Function lines | < 20 | 20-30 | > 30 |
| Class lines | < 150 | 150-200 | > 200 |
| File lines | < 300 | 300-400 | > 400 |
| Cyclomatic | < 6 | 6-10 | > 10 |
| Parameters | < 4 | 4-5 | > 5 |
| Nesting depth | < 3 | 3-4 | > 4 |

## Output Format (Summary)

```markdown
## Code Quality Review: [Component]

### Code Smells
- **[Smell]**: `function()` — Location, severity, fix

### SOLID Violations
- **[Principle]**: Description — Location, fix

### Complexity Analysis
| Function | Cyclomatic | Cognitive | Lines | Status |

### Metrics Summary
| Metric | Value | Threshold | Status |

### Passed Checks
- [x] / [ ] checklist items
```

For the full template with all sections, load `${CLAUDE_SKILL_DIR}/templates/review-template.md`.

---

**Version**: 2.0
**Spec**: SPEC-020
**For**: reviewer agent

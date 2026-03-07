# Red Flags

Patterns that indicate code quality problems, ordered by severity.

## Detection Table

| Pattern | Severity | Problem | Detection |
|---------|----------|---------|-----------|
| Function > 50 lines | High | Hard to understand/test | Count lines |
| Class > 500 lines | High | God class, too many responsibilities | Count lines |
| > 5 parameters | High | Complex interface, hard to use | Count params |
| Cyclomatic complexity > 15 | High | Too many paths, untestable | Count branches |
| Nesting depth > 4 | High | Hard to follow logic | Count indentation |
| Duplicate code blocks | High | Maintenance nightmare | Compare blocks |
| `any` type | Medium | Type safety disabled | Grep for `any` |
| Magic numbers/strings | Medium | Unclear meaning | Check literals |
| `console.log` debugging | Medium | Not production ready | Grep console |
| Commented-out code | Low | Dead code, confusing | Check comments |
| TODO without ticket | Low | Forgotten work | Grep TODO |
| Long import list > 10 | Low | File doing too much | Count imports |

## Severity Levels

| Level | Definition | Examples |
|-------|------------|----------|
| Critical | Code is broken or will fail | Unreachable code, infinite loops, null dereference |
| High | Significant maintainability issue | God class, complexity > 15, duplicate code blocks |
| Medium | Noticeable code smell | Long methods, magic numbers, deep nesting |
| Low | Minor improvement opportunity | Naming, comments, organization |

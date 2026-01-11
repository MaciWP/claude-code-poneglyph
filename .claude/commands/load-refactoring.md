---
description: Load refactoring patterns for code smell detection and safe refactoring
---

# Load Refactoring Patterns

Load detailed refactoring documentation for detecting code smells and applying safe refactorings.

## Usage

```
/load-refactoring
```

---

## What This Command Does

Loads **comprehensive refactoring patterns** into context:

1. **README.md** (5.2 KB) - Overview, principles, quick reference
2. **code-smells.md** (4.8 KB) - Code smell detection patterns
3. **safe-refactoring.md** (3.5 KB) - Safe refactoring techniques
4. **legacy-modernization.md** (2.8 KB) - Modernizing legacy patterns
5. **quality-gates.md** (2.1 KB) - CI/CD quality thresholds

**Total**: ~18 KB of refactoring patterns and best practices

---

## When to Use

Load refactoring patterns when:

### Code Quality Issues
- High cyclomatic complexity (CC > 10)
- Long methods (> 50 lines)
- Code duplication (> 5%)
- God classes or functions

### Refactoring Tasks
- Extracting methods or components
- Renaming for clarity
- Removing dead code
- Simplifying conditionals

### Legacy Modernization
- `var` → `const/let`
- Callbacks → `async/await`
- Class components → Hooks (React)
- CommonJS → ESM

### Quality Gates Setup
- Configuring CI/CD thresholds
- Blocking PRs with quality regression
- Setting up SonarQube/ESLint rules

---

## What You'll Learn

### 1. Code Smell Detection (95%+ accuracy)

**Thresholds (Industry Standard)**:
- Cyclomatic Complexity: CC > 10 (high), CC > 15 (critical)
- Method Length: > 50 lines (refactor), > 100 lines (critical)
- Duplication: > 5% (refactor), > 10% (critical)

**Patterns to detect**:
```typescript
// ❌ BAD: Long method (150 lines)
function processOrder(order) {
  // 150 lines of mixed concerns
}

// ✅ GOOD: Extracted methods
function processOrder(order) {
  validateOrder(order);
  const total = calculateTotal(order);
  return processPayment(order, total);
}
```

---

### 2. Safe Refactoring (99%+ success rate)

**Safety Protocol (IntelliJ Standard)**:
1. Run tests BEFORE refactoring
2. Apply refactoring
3. Run tests AFTER refactoring
4. Tests must pass (same count, same results)

**Common Refactorings**:
- Extract Method/Function
- Extract Component (React)
- Rename Symbol
- Inline Variable
- Replace Conditional with Polymorphism

---

### 3. Legacy Modernization

**TypeScript/JavaScript**:
```typescript
// ❌ LEGACY
var data = null;
fetchData(function(err, result) {
  if (err) console.error(err);
  else data = result;
});

// ✅ MODERN
const data = await fetchData();
```

**React**:
```typescript
// ❌ LEGACY: Class component
class Counter extends React.Component {
  state = { count: 0 };
  render() { return <div>{this.state.count}</div>; }
}

// ✅ MODERN: Functional + Hooks
function Counter() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
```

---

### 4. Quality Gates

**CI/CD Thresholds**:
| Metric | Block PR If |
|--------|-------------|
| Complexity | +10 increase |
| Duplication | +1% increase |
| Coverage | -5% decrease |
| New Issues | > 0 critical |

---

## Execute Reads

This command will load all refactoring documentation:

```typescript
// 1. Read overview
await Read({ file_path: '.claude/docs/refactoring/README.md' });

// 2. Read code smells patterns
await Read({ file_path: '.claude/docs/refactoring/code-smells.md' });

// 3. Read safe refactoring techniques
await Read({ file_path: '.claude/docs/refactoring/safe-refactoring.md' });

// 4. Read legacy modernization
await Read({ file_path: '.claude/docs/refactoring/legacy-modernization.md' });

// 5. Read quality gates
await Read({ file_path: '.claude/docs/refactoring/quality-gates.md' });
```

---

## Refactoring Checklist (After Loading)

**Before refactoring:**
- [ ] Tests exist and pass
- [ ] Understand current behavior
- [ ] Identify specific smell to fix
- [ ] Plan small, incremental changes

**During refactoring:**
- [ ] One change at a time
- [ ] Run tests after each change
- [ ] Commit frequently

**After refactoring:**
- [ ] All tests pass (same count)
- [ ] No new issues introduced
- [ ] Code review completed
- [ ] Documentation updated if needed

---

## Success Metrics

| Metric | Threshold | Source |
|--------|-----------|--------|
| **Cyclomatic Complexity** | CC ≤ 10 | Industry/SonarQube |
| **Method Length** | ≤ 50 lines | Industry standard |
| **Code Duplication** | < 5% | Industry standard |
| **Refactoring Safety** | 99%+ tests pass | IntelliJ IDEA |

---

## Related Commands

- `/load-testing-strategy` - Testing patterns for safe refactoring
- `/load-anti-hallucination` - Validation patterns
- `/load-security` - Security patterns
- `/docs` - Browse all .claude/ documentation

---

**Version**: 1.0.0
**Module**: 12-REFACTORING
**Documentation Size**: ~18 KB (5 files)
**Target**: 95%+ smell detection, 99%+ safe refactorings
**Status**: Ready to load

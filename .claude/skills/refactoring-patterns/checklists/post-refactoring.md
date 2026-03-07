# Post-Refactoring Checklist

Validation after completing refactoring.

## Required Before Merging

- [ ] All tests pass (`bun test`)
- [ ] Behavior unchanged (same inputs produce same outputs)
- [ ] No new features added during refactor (separate concerns)
- [ ] All names are clear, descriptive, and follow conventions
- [ ] No dead code remains (unused functions, variables)
- [ ] Complexity is reduced (fewer lines, simpler conditionals)
- [ ] Functions are under 20 lines where possible
- [ ] Classes have single responsibility
- [ ] Dependencies are injected, not created internally
- [ ] No duplication remains (DRY principle applied)
- [ ] Changes committed with clear messages
- [ ] PR created for review

## Verification Commands

```bash
# Type check
bun typecheck

# Full test suite
bun test

# Review diff
git diff main..HEAD
```

# Review Checklist

Comprehensive checklist for code quality reviews in TypeScript/Bun applications.

## Naming (5 items)

- [ ] Functions use verbs describing action (getUserById, validateEmail)
- [ ] Variables use nouns describing content (userList, emailValidator)
- [ ] No single-letter names except loop counters (i, j, k)
- [ ] No abbreviations unless universal (id, url, api)
- [ ] Consistent naming style (camelCase functions, PascalCase types)

## Functions (6 items)

- [ ] Each function < 30 lines (ideal < 20)
- [ ] Each function < 4 parameters (use object param if more)
- [ ] Single responsibility (does one thing well)
- [ ] No side effects unless explicitly named (saveUser, updateCache)
- [ ] Early returns to reduce nesting
- [ ] Pure functions where possible (same input = same output)

## Classes/Modules (5 items)

- [ ] Each class < 200 lines
- [ ] Single responsibility (one reason to change)
- [ ] Cohesive methods (use instance state)
- [ ] Minimal public API (encapsulation)
- [ ] No God classes (doing too much)

## Files (5 items)

- [ ] Each file < 400 lines (ideal < 300)
- [ ] Single concept per file
- [ ] Imports organized (external, internal, types)
- [ ] No circular dependencies
- [ ] Related code colocated

## Error Handling (5 items)

- [ ] All async operations have try/catch
- [ ] Error types are specific (not generic Error)
- [ ] Error messages are helpful (include context)
- [ ] Errors logged with stack trace
- [ ] Errors don't expose internal details to users

## Types (5 items)

- [ ] All function parameters typed
- [ ] All return types explicit
- [ ] No `any` (use `unknown` if needed)
- [ ] Interfaces over types for object shapes
- [ ] Discriminated unions for variants

---
name: generate-from-spec
description: Generate tests and implementation from Given-When-Then (BDD) specs when a user provides or asks to convert a spec into code.
---

# Generate From Spec

1. Ask for the Given-When-Then spec if it is not provided.
2. Parse scenarios into test cases (happy path, edge cases, error cases).
3. Follow existing test patterns in the repo (search for `*.test.ts`).
4. Generate implementation that satisfies the tests and project conventions.
5. Run the relevant test command if allowed and report results.

---
id: refactor
name: Refactor
description: Safe refactoring with analysis and verification
version: "1.0"
triggers:
  keywords: [refactor, clean, simplify, extract, reorganize, restructure]
  complexity:
    min: 20
variables:
  target: ""
  workDir: "."
---

### Node: analyze
- type: agent
- agentType: scout
- prompt: "Analyze the code that needs refactoring:\n\n{{target}}\n\nIdentify code smells, complexity hotspots, and improvement opportunities."

### Node: snapshot-tests
- type: command
- command: "bun test"
- deps: []

### Node: refactor
- type: agent
- agentType: builder
- prompt: "Refactor the code based on this analysis:\n\nTarget: {{target}}\n\nAnalysis: {{context.analyze.output}}\n\nRules:\n- Preserve behavior (tests must still pass)\n- Apply SOLID principles\n- Reduce complexity\n- Improve naming"
- deps: [analyze, snapshot-tests]
- maxRetries: 2

### Node: lint
- type: command
- command: "bunx biome check --write ."
- deps: [refactor]
- continueOnFailure: true

### Node: typecheck
- type: command
- command: "bun typecheck"
- deps: [refactor]

### Node: test
- type: command
- command: "bun test"
- deps: [lint, typecheck]

### Node: regression-gate
- type: gate
- deps: [test]
- onSuccess: review
- onFailure: rollback-fix

### Node: rollback-fix
- type: agent
- agentType: builder
- prompt: "The refactoring broke tests. Fix the issues while preserving the refactoring improvements:\n\nTest output: {{context.test.output}}\nOriginal target: {{target}}"
- deps: [regression-gate]

### Node: review
- type: agent
- agentType: reviewer
- prompt: "Review the refactoring for quality improvements:\n\nOriginal target: {{target}}\n\nCheck that behavior is preserved, complexity is reduced, and code is cleaner."
- deps: [regression-gate]

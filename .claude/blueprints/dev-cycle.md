---
id: dev-cycle
name: Development Cycle
description: Standard implementation workflow with quality gates
version: "1.0"
triggers:
  keywords: [implement, feature, add, create, build, develop]
  complexity:
    min: 30
variables:
  task: ""
  workDir: "."
---

### Node: implement
- type: agent
- agentType: builder
- prompt: "Implement the following task:\n\n{{task}}\n\nWork directory: {{workDir}}"
- maxRetries: 2

### Node: lint
- type: command
- command: "bunx biome check --write ."
- deps: [implement]
- continueOnFailure: true

### Node: typecheck
- type: command
- command: "bun typecheck"
- deps: [implement]

### Node: test
- type: command
- command: "bun test"
- deps: [lint, typecheck]

### Node: quality-gate
- type: gate
- deps: [test]
- onSuccess: review
- onFailure: fix

### Node: fix
- type: agent
- agentType: builder
- prompt: "Fix the failing tests and type errors. Previous output:\n\n{{context.test.output}}\n\nOriginal task: {{task}}"
- deps: [quality-gate]
- maxRetries: 1

### Node: retest
- type: command
- command: "bun test"
- deps: [fix]

### Node: review
- type: agent
- agentType: reviewer
- prompt: "Review the implementation for code quality, security, and correctness.\n\nOriginal task: {{task}}"
- deps: [quality-gate]

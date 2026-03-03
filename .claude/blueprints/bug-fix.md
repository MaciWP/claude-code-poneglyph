---
id: bug-fix
name: Bug Fix
description: Diagnose and fix bugs with verification
version: "1.0"
triggers:
  keywords: [fix, bug, error, issue, broken, crash, failing]
  complexity:
    min: 0
variables:
  bug: ""
  workDir: "."
---

### Node: diagnose
- type: agent
- agentType: scout
- prompt: "Investigate and diagnose this bug:\n\n{{bug}}\n\nFind the root cause. Check error logs, stack traces, and related code."

### Node: fix
- type: agent
- agentType: builder
- prompt: "Fix this bug based on the diagnosis:\n\nBug: {{bug}}\n\nDiagnosis: {{context.diagnose.output}}\n\nApply the minimal fix needed."
- deps: [diagnose]
- maxRetries: 2

### Node: typecheck
- type: command
- command: "bun typecheck"
- deps: [fix]

### Node: test
- type: command
- command: "bun test"
- deps: [fix]

### Node: verify-gate
- type: gate
- deps: [typecheck, test]
- onSuccess: done
- onFailure: retry-fix

### Node: retry-fix
- type: agent
- agentType: builder
- prompt: "The fix didn't pass verification. Fix the remaining issues:\n\nTypecheck: {{context.typecheck.output}}\nTests: {{context.test.output}}\n\nOriginal bug: {{bug}}"
- deps: [verify-gate]
- maxRetries: 1

### Node: done
- type: command
- command: "echo Bug fix verified successfully"
- deps: [verify-gate]

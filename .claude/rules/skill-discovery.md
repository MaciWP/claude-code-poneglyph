<!-- Last verified: 2026-04-25 -->

# Skill Discovery — poneglyph

## Available skills

| Skill | Covers |
|---|---|
| `anti-hallucination` | Validation before asserting: files, functions, APIs |
| `careful-mode` | Conservative mode for risky or irreversible operations |
| `code-quality` | SOLID, DRY, code smells, refactoring, technical debt |
| `database-patterns` | Schema design, indexes, migrations, queries |
| `decide` | Strategic decisions with multi-agent perspectives |
| `decision-stress-test` | Multi-perspective stress-test (8 perspectives + cross-debate + 5 techniques) calibrated by stakes for pre-commitment technical decisions |
| `diagnostic-patterns` | Incidents, error spikes, circuit breakers, retries |
| `explain-changes` | Educational explanation of code changes (file/commit/branch/pending) with verification against official docs |
| `freeze-mode` | Read-only mode — blocks all file modifications |
| `logging-strategy` | Observability, log levels, structured logging |
| `lsp-operations` | Semantic navigation: definitions, references, call hierarchy |
| `meta-create-agent` | Create new specialized agents |
| `meta-create-hook` | Create new hooks (PreToolUse, PostToolUse, Stop…) |
| `meta-create-mcp` | Create MCP server configurations |
| `meta-create-plugin` | Create new Claude Code plugins |
| `meta-create-rule` | Create new behavioral rules |
| `meta-create-skill` | Create new skills with frontmatter and references |
| `meta-settings-cookbook` | Patterns and recipes for settings.json |
| `orchestrator-protocol` | Lead: complexity routing, delegation, error recovery |
| `performance-review` | Bottlenecks, memory, latency, N+1 queries |
| `planner-protocol` | Adaptive planning protocol (Quick/Standard/Full): Discovery, Research, Gap Analysis, Classification, Roadmap, Validation |
| `prompt-engineer` | Improve vague or ambiguous prompts |
| `security-review` | OWASP, vulnerabilities, secrets, auditing |
| `sync-claude` | Synchronize .claude/ to ~/.claude/ via symlinks |
| `traces` | Session costs, token usage, analytics |

## Reference inventory

### code-quality
`anti-patterns-reference` · `common-issues` · `complexity-metrics` · `extract-class` · `extract-function` · `red-flags` · `refactoring-process` · `review-checklist` · `solid-violations`

### database-patterns
`index-strategy` · `migration-safety`

### decision-stress-test
`01-perspectives` · `02-techniques` · `03-stakes-calibration` · `04-anti-patterns` · `05-output-template` · `06-cross-debate`

### diagnostic-patterns
`5-whys-analysis` · `diagnostic-service` · `error-classification` · `error-diagnosis` · `pattern-checkpoint` · `pattern-dlq` · `pattern-graceful-degradation` · `pattern-manual-rollback` · `pattern-saga` · `retry-patterns` · `stack-trace-analysis`

### explain-changes
`input-resolution` · `investigation-checklist` · `output-template` · `verification-rules` · `interaction-patterns`

### logging-strategy
`log-levels-guide` · `structured-format`

### meta-create-agent
`examples` · `frontmatter-spec` · `templates-spec`

### meta-create-hook
`events-catalog` · `examples` · `gotchas` · `handlers-and-settings` · `templates`

### meta-create-mcp
`examples` · `gotchas` · `reference` · `templates`

### meta-create-plugin
`examples` · `gotchas-and-cli` · `manifest-spec` · `templates`

### meta-create-rule
`examples` · `gotchas` · `rule-system` · `templates`

### meta-create-skill
`directory-structure` · `examples-library` · `frontmatter-spec` · `skill-types` · `template-placeholders`

### orchestrator-protocol
`01-verification` · `02-prompt-scoring` · `03-complexity-routing` · `04-agent-selection` · `05-skill-matching` · `06-context-arch-h` · `07-delegation-recovery` · `08-output-style`

### planner-protocol
`01-discovery` · `02-research` · `03-gap-analysis` · `04-classification-waves` · `05-workflow-phases` · `06-output-format` · `07-team-mode` · `08-quality-gates`

### performance-review
`memory-leak-patterns` · `n-plus-one-patterns`

### security-review
`owasp-quick-ref`

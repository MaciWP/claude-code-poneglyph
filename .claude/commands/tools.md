---
description: Show all available tools (skills, agents, commands)
---

# Available Tools

Display all available tools, skills, agents, and commands in the project.

## Usage

```
/tools [category]
```

### Without Arguments

Shows everything available:

```
/tools
```

### With Category

Shows specific category:

```
/tools skills     # Show only skills
/tools agents     # Show only agents
/tools commands   # Show only commands
```

---

## Output Format

When you run `/tools`, display:

```
═══════════════════════════════════════════════════════════════════════════════
🛠️  AVAILABLE TOOLS
═══════════════════════════════════════════════════════════════════════════════

## 🎯 SKILLS (24 available)

1. anti-hallucination - Validation patterns to prevent hallucination
2. api-design - REST API design patterns
3. bun-best-practices - Bun runtime best practices
4. code-quality - Code quality analysis
5. code-style-enforcer - Code style enforcement
6. config-validator - Configuration validation
7. create-agent - Create new agents
8. create-skill - Create new skills
9. database-patterns - Database access patterns
10. diagnostic-patterns - Diagnostic and debugging patterns
11. expert-patterns - Best practices comparison from authoritative sources
12. logging-strategy - Logging strategy
13. lsp-operations - LSP navigation operations
14. performance-review - Performance review patterns
15. playwright-browser - Browser automation with Playwright
16. prompt-engineer - Prompt engineering patterns
17. recovery-strategies - Recovery strategies for failures
18. refactoring-patterns - Refactoring patterns
19. retry-patterns - Retry and circuit breaker patterns
20. security-review - Security review patterns
21. sync-claude - Sync claude configuration
22. testing-strategy - Testing strategy and patterns
23. typescript-patterns - TypeScript best practices
24. websocket-patterns - WebSocket patterns

---

## 🤖 AGENTS (15 available)

1. architect - Feature design and architecture
2. bug-documenter - Document bugs, root causes, solutions
3. builder - Implement code changes
4. code-quality - Code quality analysis (background)
5. command-loader - Load and manage commands
6. error-analyzer - Analyze and diagnose errors
7. knowledge-sync - Sync knowledge across sessions
8. merge-resolver - Resolve merge conflicts
9. planner - Plan complex implementations
10. refactor-agent - Refactoring operations
11. reviewer - Code review (background)
12. scout - Explore and discover codebase
13. security-auditor - Security vulnerability detection
14. task-decomposer - Break complex tasks into subtasks
15. test-watcher - Watch and validate tests

---

## ⚡ COMMANDS (7 available)

📚 Documentation & Discovery:
1. /docs [topic]              - Browse available documentation
2. /tools [category]          - Show all available tools (this command)
3. /skills                    - List all skills
4. /agents                    - List all agents
5. /commands                  - List all commands

🛡️ Anti-Hallucination:
6. /load-anti-hallucination   - Load validation patterns
7. /validate-claim <file> [func] - Validate specific claim

🐛 Debugging:
8. /quick-debug               - Fast debugging workflow

═══════════════════════════════════════════════════════════════════════════════

💡 TIP: Use specific commands for details:
   /skills     - More details on skills
   /agents     - More details on agents
   /commands   - More details on commands
   /docs       - Browse documentation

═══════════════════════════════════════════════════════════════════════════════
```

---

## Implementation

### Detect Available Resources

**Skills** (read `.claude/skills/` directory):
```typescript
const skills = await Glob({ pattern: '.claude/skills/**/SKILL.md' });
// Parse each SKILL.md to get name and description
```

**Agents** (read `.claude/agents/` directory):
```typescript
const agents = await Glob({ pattern: '.claude/agents/*.md' });
// Parse each agent file for name and description
```

**Commands** (read `.claude/commands/` directory):
```typescript
const commands = await Glob({ pattern: '.claude/commands/*.md' });
// Parse YAML frontmatter for description
```

---

## Category-Specific Output

### `/tools skills`

```
🎯 SKILLS (24 available)

Core Patterns:
• typescript-patterns - TypeScript best practices
• bun-best-practices - Bun runtime patterns
• api-design - REST API design
• code-style-enforcer - Code style enforcement
• code-quality - Code quality analysis

Security & Reliability:
• security-review - Security review patterns
• retry-patterns - Retry and circuit breaker
• recovery-strategies - Recovery strategies
• config-validator - Configuration validation

Testing & Debugging:
• testing-strategy - Testing patterns
• diagnostic-patterns - Debugging patterns
• logging-strategy - Logging strategy
• anti-hallucination - Validation patterns
• performance-review - Performance review

Data & Communication:
• database-patterns - Database access patterns
• websocket-patterns - WebSocket patterns

Tooling:
• playwright-browser - Browser automation
• lsp-operations - LSP navigation
• create-agent - Create new agents
• create-skill - Create new skills
• sync-claude - Sync claude config
• prompt-engineer - Prompt engineering
• expert-patterns - Best practices comparison
• refactoring-patterns - Refactoring patterns

Activation: Skill(name)
Example: Skill(typescript-patterns)
```

### `/tools agents`

```
🤖 AGENTS (15 available)

Implementation:
• builder - Implement code changes
• refactor-agent - Refactoring operations
• merge-resolver - Resolve merge conflicts

Planning & Design:
• architect - Feature design and architecture
• planner - Plan complex implementations
• task-decomposer - Break tasks into subtasks

Review & Quality:
• reviewer - Code review
• code-quality - Code quality analysis
• security-auditor - Security vulnerability detection
• test-watcher - Watch and validate tests

Analysis & Discovery:
• scout - Explore codebase
• error-analyzer - Analyze errors
• bug-documenter - Document bugs

Utilities:
• command-loader - Load and manage commands
• knowledge-sync - Sync knowledge across sessions

Activation: Task(subagent_type='agent-name', prompt='task description')
Example: Task(subagent_type='builder', prompt='Implement validation logic')
```

### `/tools commands`

```
⚡ COMMANDS (7 available)

Documentation:
/docs [topic]              - Browse documentation
/load-anti-hallucination   - Load validation patterns

Discovery:
/tools [category]          - Show all tools
/skills                    - List skills
/agents                    - List agents
/commands                  - List commands

Validation:
/validate-claim <file>     - Validate file/function claim

Debugging:
/quick-debug               - Fast debugging

Usage: Type /command-name in chat
Example: /load-anti-hallucination
```

---

## When to Use

**For Claude (me)**:
- When I forget what skills are available
- Before suggesting a workflow (check if skill exists)
- When user asks "what can you do?"

**For User**:
- Discover available tools
- Learn how to activate skills/agents
- See all commands at a glance

---

## Integration with CLAUDE.md

This command complements the "Available Resources" section in CLAUDE.md by providing:
- Dynamic discovery (reads actual files)
- Usage examples
- Category filtering

---

**Version**: 1.0.0
**Related**: `/skills`, `/agents`, `/commands`, `/docs`
**Auto-discovery**: Reads .claude/ directories dynamically

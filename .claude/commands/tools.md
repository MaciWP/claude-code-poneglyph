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

## 🎯 SKILLS (11 available)

1. anti-hallucination - Validation patterns to prevent hallucination
2. code-quality - Code quality analysis and refactoring patterns
3. database-patterns - Database access patterns
4. diagnostic-patterns - Diagnostic, debugging, retry, and recovery patterns
5. logging-strategy - Logging strategy
6. lsp-operations - LSP navigation operations
7. meta-create-agent - Create new agents
8. meta-create-skill - Create new skills
9. performance-review - Performance review patterns
10. security-review - Security review patterns
11. sync-claude - Sync claude configuration

---

## 🤖 AGENTS (7 available)

1. architect - Design architecture and delegate implementation
2. builder - Implement code, refactoring, docs, merge conflict resolution
3. command-loader - Load commands and skills (infrastructure)
4. error-analyzer - Diagnose errors without fixing
5. planner - Plan implementation and task decomposition (DAG, critical path)
6. reviewer - Validate quality (standard, security, code quality, coverage, performance)
7. scout - Explore codebase read-only

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
🎯 SKILLS (11 available)

Quality & Validation:
• anti-hallucination - Validation patterns to prevent hallucination
• code-quality - Code quality analysis and refactoring patterns
• security-review - Security review patterns
• performance-review - Performance review patterns

Debugging & Data:
• diagnostic-patterns - Diagnostic, debugging, retry, and recovery patterns
• database-patterns - Database access patterns
• logging-strategy - Logging strategy

Navigation & Tooling:
• lsp-operations - LSP navigation
• meta-create-agent - Create new agents
• meta-create-skill - Create new skills
• sync-claude - Sync claude config

Activation: Skill(name)
Example: Skill(typescript-patterns)
```

### `/tools agents`

```
🤖 AGENTS (7 available)

Implementation:
• builder - Implement code, refactoring, docs, merge conflict resolution

Planning & Design:
• architect - Design architecture and delegate implementation
• planner - Plan implementation and task decomposition (DAG, critical path)

Review & Quality:
• reviewer - Validate quality (standard, security, code quality, coverage, performance)

Analysis & Discovery:
• scout - Explore codebase read-only
• error-analyzer - Diagnose errors without fixing

Utilities:
• command-loader - Load commands and skills (infrastructure)

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

---
name: prompt-engineer
description: |
  Improves user prompts and generates system prompts for Claude Code agents.
  Use proactively when: prompts are vague, creating new agents, improving existing prompts.
  Keywords - prompt, agent, mejorar, vago, crear agente, system prompt, enhance, improve
activation:
  keywords:
    - prompt
    - agent
    - crear agente
    - mejorar prompt
    - vago
    - unclear
    - enhance prompt
    - system prompt
    - improve prompt
for_agents: [builder, architect, extension-architect]
version: "1.0"
---

# Prompt Engineer Skill

Dual-purpose skill for improving user prompts and generating agent system prompts.

## When to Use

| Situation | Action |
|-----------|--------|
| User prompt is vague | Score and enhance |
| Score < 70 | Auto-improve prompt |
| Creating new agent | Generate YAML + system prompt |
| Reviewing agent prompt | Score and suggest improvements |

## Core Rules

| Rule | Application |
|------|-------------|
| Score before improving | Use 5-criteria scoring |
| Detect red flags | Vague words trigger enhancement |
| Template for structure | Apply Template Pattern |
| Context auto-detect | Build from project files |

## Quick Reference

### Prompt Scoring (5 x 20 = 100 pts)

| Criterion | 20 pts | 10 pts | 0 pts |
|-----------|--------|--------|-------|
| **Clarity** | Action verb + specific target | Generic verb ("update") | "fix this" |
| **Context** | File paths + tech + versions | Tech mentioned | Nothing |
| **Structure** | XML/headers organized | Paragraphs | Wall of text |
| **Success Criteria** | Metrics (<100ms, >90%) | Vague ("better") | None |
| **Actionable** | No questions needed | 1-2 clarifications | Very vague |

### Score Thresholds

| Score | Action |
|-------|--------|
| >= 70 | Use prompt as-is |
| < 70 | **Enhance automatically** |

### Vague Words (Red Flags)

```
somehow, maybe, various, some, stuff, things, better, improve,
optimize (no metrics), fix (no target), arregla, mejora, algo, eso, esto
```

## Enhancement Patterns

### Pattern 1: Template Pattern

**When**: Vague prompts without structure

**Input**: `"fix the login"`

**Output**:
```xml
<task>Fix [specific issue] in [file path]</task>

<context>
  <file>[path:line]</file>
  <error>[error message if applicable]</error>
  <tech_stack>[detected from project]</tech_stack>
</context>

<instructions>
1. Identify the specific issue
2. Locate relevant files
3. Diagnose root cause
4. Implement fix
5. Verify fix works
</instructions>

<success_criteria>
- [Specific measurable outcome]
- [Test passes / error resolved]
</success_criteria>
```

### Pattern 2: Chain of Thought (CoT)

**When**: Complex multi-step tasks (architecture, refactoring, debugging)

**Add**:
```xml
<thinking>
Think step-by-step before implementing:
1. Analyze current state
2. Identify all components involved
3. Plan changes in order of dependencies
4. Consider edge cases and error scenarios
5. Execute with validation at each step
</thinking>
```

### Pattern 3: Context Builder

**When**: Missing project context

**Auto-detect and add**:
- Tech stack from package.json, manage.py, etc.
- Relevant files by keywords
- Project patterns from CLAUDE.md

```xml
<context>
  <project>[detected]</project>
  <tech_stack>
    - Runtime: [Bun/Node/Python]
    - Framework: [Elysia/Express/Django]
  </tech_stack>
  <relevant_files>
    - [file1.ts] (keyword match)
    - [file2.ts] (keyword match)
  </relevant_files>
</context>
```

## Agent Prompt Generation

### YAML Frontmatter Template

```yaml
---
name: agent-identifier          # kebab-case, unique
description: |
  [Role description].
  Use proactively when: [trigger conditions].
  Keywords - keyword1, keyword2, keyword3
model: sonnet                   # sonnet | opus | haiku
tools: [Read, Write, Edit, Bash, Grep, Glob]
disallowedTools: [Write, Bash]  # optional, for read-only
---
```

### Permission Levels

| Type | Tools | Use Case |
|------|-------|----------|
| **Read-Only** | Read, Grep, Glob | Reviewers, analyzers |
| **Research** | Read, Grep, Glob, WebFetch, WebSearch | Investigation |
| **Code Writer** | Read, Write, Edit, Bash, Glob, Grep | Implementation |
| **Full Access** | All tools | Complex debugging |

### System Prompt Structure

```markdown
# [Agent Name]

You are a [ROLE] with expertise in [DOMAIN].

## Your Task
1. [Primary objective]
2. [Secondary objective]
3. [Validation step]

## Process
1. [Step 1 with tool]
2. [Step 2]
3. [Validation]

## Guidelines
- [Behavioral constraint 1]
- [Quality standard]

## Output Format

| Field | Description |
|-------|-------------|
| ... | ... |

## Anti-Hallucination Rules
1. Use Glob/Grep to verify files exist before referencing
2. Read files before making claims about content
3. Never assume code structure without verification
```

## Examples

### Example 1: Enhancing Vague Prompt

**Input** (Score: 15/100):
```
fix the user bug
```

**Output** (Score: 78/100):
```xml
<task>Fix bug in user module</task>

<context>
  <project>claude-code-poneglyph</project>
  <tech_stack>Bun 1.x, Elysia, React 18</tech_stack>
  <relevant_files>
    - server/src/services/users.ts
    - web/src/components/User/
  </relevant_files>
</context>

<instructions>
1. Identify the specific bug
2. Locate relevant user-related files
3. Diagnose root cause
4. Implement fix
5. Test the fix
</instructions>

<success_criteria>
- Bug is resolved
- No regression in related functionality
</success_criteria>
```

### Example 2: Generating Agent Prompt

**Input**: `crear agente para code review`

**Output**:
```yaml
---
name: code-reviewer
description: |
  Senior code reviewer for quality, security, and maintainability.
  Use proactively when: after code changes, before commits.
  Keywords - review, quality, security, audit, check code
model: sonnet
tools: [Read, Grep, Glob]
disallowedTools: [Write, Edit, Bash]
---

# Code Reviewer

You are a senior code reviewer ensuring quality and security.

## Your Task
1. Analyze code for best practices violations
2. Identify security vulnerabilities
3. Check for performance issues

## Process
1. Use Glob to find changed files
2. Read each file completely
3. Analyze against quality criteria
4. Generate structured report

## Guidelines
- Never modify code directly
- Provide actionable feedback with file:line
- Prioritize by severity (Critical > High > Medium > Low)

## Output Format

| Severity | Location | Issue | Recommendation |
|----------|----------|-------|----------------|
| CRITICAL | file.ts:45 | Issue | Fix suggestion |

## Anti-Hallucination Rules
1. Only report issues in files you have read
2. Quote exact code when referencing
3. Verify line numbers are accurate
```

## File Locations

| Type | Path | Scope |
|------|------|-------|
| Project skills | `.claude/skills/` | This project |
| User skills | `~/.claude/skills/` | All projects |
| Project agents | `.claude/agents/` | This project |
| User agents | `~/.claude/agents/` | All projects |

## Checklist

### Improving User Prompt

- [ ] Calculate 5-criteria score
- [ ] If < 70, apply Template Pattern
- [ ] Add Context Builder if missing context
- [ ] Add CoT if complex task
- [ ] Verify improved score >= 70

### Creating Agent

- [ ] Determine role and permissions
- [ ] Use YAML frontmatter template
- [ ] Structure: Task -> Process -> Guidelines -> Output
- [ ] Include Anti-Hallucination Rules
- [ ] Validate against SPEC-021

---

**Version**: 1.0.0
**Spec**: SPEC-020

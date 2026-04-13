# Config Scope Rule

## Two-Level Architecture

```
┌────────────────────────────────────────┐
│ Level 1: GLOBAL (Poneglyph)            │
│ ~/.claude/ ← symlink to Poneglyph      │
│ • Base orchestration                   │
│ • Agents, skills, rules, hooks         │
└────────────────────┬───────────────────┘
                     │ combined with
┌────────────────────▼───────────────────┐
│ Level 2: PROJECT (Specialization)      │
│ ./CLAUDE.md ← from the target project  │
│ ./.claude/  ← local extensions         │
│ • CLAUDE.md — domain narrative          │
│ • rules/ — ONLY constraints (minimal)  │
│ • skills/ — project knowledge on-demand │
│ • commands, settings, hooks             │
└────────────────────────────────────────┘
```

## Rules

| Context | Modify | Where |
|---------|--------|-------|
| Base orchestration | Poneglyph | `D:\PYTHON\claude-code-poneglyph\` |
| Specialization | Target project | `./.claude/` of the project |

## Important

- **Poneglyph** = source of the orchestration (versioned in git)
- **~/.claude/** = symlink that propagates the base
- **Each project** = can have its own `CLAUDE.md` + `.claude/`
- **Claude Code** = loads and combines BOTH levels

## Project-level: Rules vs Skills

| Use a rule when | Use a skill when |
|---|---|
| Violation is blocking (constraint) | Content is guidance, not constraint |
| Must be in context every prompt | Only useful for specific tasks |
| Short (<500 tokens) | Any size (loads on-demand via Arch H) |
| e.g., module-boundaries, contract-first | e.g., naming-standards, function-design |

Project skills live at `./.claude/skills/` and use the same Arch H Read mechanism as global skills. The project's `skill-matching.md` rule provides the discovery layer.

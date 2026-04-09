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
│ • Domain context                       │
│ • Project-specific agents/skills       │
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

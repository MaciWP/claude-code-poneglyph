---
description: "Benchmark all skills - structure, triggers, and budget analysis"
---

## Benchmark All Skills

Run a comprehensive audit of all installed skills.

### Steps

1. **Discover all skills**: `ls .claude/skills/`
2. **For each skill**, read SKILL.md and extract:
   - Line count
   - Description (length, has colons, is quoted)
   - Frontmatter fields (type, disable-model-invocation, argument-hint)
   - Reference file count
   - Uses `${CLAUDE_SKILL_DIR}`?

3. **Calculate budget**:
   - Sum all description lengths
   - Add XML overhead (~109 chars per skill)
   - Compare to ~15,500 char limit
   - Report: `used / limit (percentage)`

4. **Identify issues**:
   - Skills > 500 lines (CRITICAL)
   - Skills > 300 lines (WARNING)
   - Descriptions with unquoted colons
   - Missing `type:` field
   - Missing `disable-model-invocation:` field
   - capability-uplift skills that may need re-evaluation

5. **Output report**:

### Inventory

| # | Skill | Lines | Desc len | Type | DMI | Refs | Issues |
|---|-------|-------|----------|------|-----|------|--------|

### Budget

| Metric | Value |
|--------|-------|
| Total skills | (count) |
| Description chars | (sum) |
| XML overhead | (estimated) |
| Total budget used | (sum) / 15,500 (percentage) |
| Remaining capacity | (skills that can be added) |

### Issues Found

| Severity | Skill | Issue |
|----------|-------|-------|
| CRITICAL | ... | ... |
| WARNING | ... | ... |

### Recommendations

(Prioritized list of improvements)

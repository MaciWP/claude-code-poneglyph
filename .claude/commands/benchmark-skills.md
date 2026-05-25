---
description: "Audit skills — inventory all (default) or analyze one in depth (--single). Metrics: lines, triggers, structure, budget, test prompts."
argument-hint: "[--single=<name>] [--filter=<prefix>] [--top=<N>]"
---

## Benchmark Skills

Audit installed skills. Without arguments: global inventory + budget. With `--single=<name>`: deep analysis of a single skill (includes generated test prompts).

### Modes

| Invocation | Behavior |
|---|---|
| `/benchmark-skills` | Global inventory of ALL skills + budget + issues |
| `/benchmark-skills --single=<name>` | Deep analysis of one skill (structure + test prompts) |
| `/benchmark-skills --filter=<prefix>` | Inventory filtered by skill name prefix |
| `/benchmark-skills --top=<N>` | Inventory of top N largest skills by line count |

Flags `--filter` and `--top` apply only to inventory mode. `--single` is exclusive (cannot combine with filter/top).

---

### Mode 1 — Inventory (no `--single`)

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
4. **Identify issues by severity**:
   - **CRITICAL**: SKILL.md > 500 lines
   - **WARNING**: SKILL.md > 300 lines
   - Descriptions with unquoted colons
   - Missing `type:` field
   - Missing `disable-model-invocation:` field
   - `capability-uplift` skills that may need re-evaluation
5. **Apply filters** if `--filter=<prefix>` or `--top=<N>` is present
6. **Output**: Inventory + Budget + Issues + Recommendations (see Inventory Output below)

### Mode 2 — Single-skill deep analysis (`--single=<name>`)

1. **Read the skill** at `.claude/skills/<name>/SKILL.md`
2. **Identify skill type** from `type:` frontmatter field
3. **Analyze description quality**:
   - Are trigger keywords front-loaded in first 50 chars?
   - Is description < 1024 chars?
   - Does it avoid colons or properly quote them?
4. **Generate 3 test prompts** that SHOULD trigger this skill (positives)
5. **Generate 2 test prompts** that should NOT trigger this skill (negatives)
6. **Check structure**:
   - SKILL.md < 500 lines?
   - Uses `${CLAUDE_SKILL_DIR}` for references?
   - Has `type:` and `disable-model-invocation:` fields?
   - Reference files are self-contained?
7. **If type is `capability-uplift`**: note whether baseline model capability may have caught up
8. **Output**: single-skill report (see Single-Skill Output below)

---

### Inventory Output (Mode 1)

#### Inventory

| # | Skill | Lines | Desc len | Type | DMI | Refs | Issues |
|---|-------|-------|----------|------|-----|------|--------|

#### Budget

| Metric | Value |
|--------|-------|
| Total skills | (count) |
| Description chars | (sum) |
| XML overhead | (estimated) |
| Total budget used | (sum) / 15,500 (percentage) |
| Remaining capacity | (skills that can be added) |

#### Issues Found

| Severity | Skill | Issue |
|----------|-------|-------|
| CRITICAL | ... | ... |
| WARNING | ... | ... |

#### Recommendations

(Prioritized list of improvements)

---

### Single-Skill Output (Mode 2)

| Metric | Value |
|--------|-------|
| Skill | <name> |
| Type | (from frontmatter) |
| SKILL.md lines | (count) |
| Description length | (chars) |
| Has type field | Yes/No |
| Has dmi field | Yes/No |
| Uses CLAUDE_SKILL_DIR | Yes/No |
| Reference files | (count) |
| Trigger keywords quality | Good/Needs tuning |
| Structure compliance | Pass/Fail |

**Test prompts (positive — should trigger)**:
1. ...
2. ...
3. ...

**Test prompts (negative — should NOT trigger)**:
1. ...
2. ...

**Recommendations**:
- ...

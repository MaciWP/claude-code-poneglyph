---
description: "Evaluate a skill's quality and trigger accuracy"
argument-hint: "[skill-name]"
---

## Evaluate Skill: $ARGUMENTS

Evaluate the specified skill for quality, trigger accuracy, and effectiveness.

### Steps

1. **Read the skill** at `.claude/skills/$ARGUMENTS/SKILL.md`
2. **Identify skill type** from `type:` frontmatter field
3. **Analyze description quality**:
   - Are trigger keywords front-loaded in first 50 chars?
   - Is description < 1024 chars?
   - Does it avoid colons or properly quote them?
4. **Generate 3 test prompts** that SHOULD trigger this skill
5. **Generate 2 negative prompts** that should NOT trigger this skill
6. **Check structure**:
   - SKILL.md < 500 lines?
   - Uses `${CLAUDE_SKILL_DIR}` for references?
   - Has `type:` and `disable-model-invocation:` fields?
   - Reference files are self-contained?
7. **If type is `capability-uplift`**: Note whether baseline model capability may have caught up
8. **Output report**:

| Metric | Value |
|--------|-------|
| Skill | $ARGUMENTS |
| Type | (from frontmatter) |
| SKILL.md lines | (count) |
| Description length | (chars) |
| Has type field | Yes/No |
| Has dmi field | Yes/No |
| Uses CLAUDE_SKILL_DIR | Yes/No |
| Reference files | (count) |
| Trigger keywords quality | Good/Needs tuning |
| Structure compliance | Pass/Fail |
| Recommendations | (list) |

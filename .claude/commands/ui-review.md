---
description: Execute UI user stories with Playwright for visual QA review
---

# /ui-review

Execute user stories against the running application using Playwright browser automation.

## Usage

```
/ui-review [story-name | all]
```

### Parameters

- **$ARGUMENTS**: Name of a specific story (without `.yaml` extension) or `all` to run every story. Defaults to `all` if empty.

### Examples

```
/ui-review                    # Run all stories
/ui-review all                # Run all stories
/ui-review chat-flow          # Run only chat-flow story
/ui-review session-management # Run only session-management story
```

## Execution Protocol

### Step 1: Discover Stories

```bash
ls .claude/ui-stories/*.yaml
```

If `$ARGUMENTS` is empty or `all`, queue all discovered stories. Otherwise, match `$ARGUMENTS` to a specific `.yaml` file.

### Step 2: Pre-flight Checks

Verify before proceeding:

| Check | Command | Expected |
|-------|---------|----------|
| Frontend server | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173` | `200` |
| Backend server | `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080` | `200` |
| Playwright installed | `npx playwright --version` | Version string |

If any check fails, report the issue and stop. Suggest fixes:
- Servers not running: `bun dev:server` and `bun dev:web`
- Playwright not installed: `npx playwright install chromium`

### Step 3: Create Evidence Directory

```bash
mkdir -p .claude/ui-evidence/
```

### Step 4: Execute Stories

For each story, delegate to the `browser-qa` agent:

```
Task(subagent_type="browser-qa", prompt="Execute the user story at .claude/ui-stories/{name}.yaml. Save evidence to .claude/ui-evidence/{name}/. Report results as a markdown table.")
```

If there are 2+ stories, launch agents in parallel for maximum efficiency.

### Step 5: Consolidate Report

After all agents complete, produce a consolidated report:

```markdown
## UI Review Report

**Date**: {timestamp}
**Stories executed**: {count}
**Passed**: {pass_count}
**Failed**: {fail_count}

### Results

| Story | Steps | Passed | Failed | Status |
|-------|-------|--------|--------|--------|
| chat-flow | 7 | 7 | 0 | PASS |
| session-management | 7 | 5 | 2 | FAIL |

### Failures

#### session-management

| Step | Action | Target | Error |
|------|--------|--------|-------|
| 3 | click | button:has-text('New') | Element not found |
| 5 | assert | .session-list | Not visible after 5s |

### Evidence

- `.claude/ui-evidence/chat-flow/` - 3 screenshots
- `.claude/ui-evidence/session-management/` - 3 screenshots
```

## Notes

- Stories are declarative YAML in `.claude/ui-stories/`
- The `browser-qa` agent handles all Playwright execution
- Screenshots are saved to `.claude/ui-evidence/{story-name}/`
- This command does NOT modify any application code
- Servers must be running before execution

---

**Version**: 1.0.0
**Related**: `.claude/skills/playwright-browser/SKILL.md`, `.claude/agents/browser-qa.md`

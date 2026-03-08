# Troubleshooting

## Orchestration Problems

### Lead Uses a Prohibited Tool Directly

**Symptoms**: Lead session executes Read, Edit, Write, Bash, Glob, or Grep directly instead of delegating.

**Cause**: Lead Orchestrator rules not loaded or ignored.

**Solution**:
- Remind Lead of `.claude/rules/lead-orchestrator.md` rules
- Lead must ONLY use: Task, Skill, AskUserQuestion, TaskList/Create/Update
- All code execution must go through builder agent
- All exploration must go through scout agent

---

### Agent Fails or Times Out

**Symptoms**: Task delegation returns error or hangs.

**Cause**: Agent prompt too broad, missing context, or tool failure.

**Solution**:
1. Check the error message from the failed Task
2. Use error-analyzer agent to diagnose:
   ```
   Task(subagent_type="error-analyzer", prompt="Analyze failure: <error details>")
   ```
3. Review `.claude/skills/recovery-strategies/` for retry patterns
4. Re-delegate with more specific prompt and relevant skills loaded

---

### Hook Timeout or Failure

**Symptoms**: Pre/post/stop hook fails during execution.

**Cause**: Hook implementation error, missing dependency, or excessive runtime.

**Solution**:
1. Run hook tests to identify the failing hook:
   ```bash
   bun test ./.claude/hooks/
   ```
2. Check the specific hook file in `.claude/hooks/validators/`
3. Verify the hook TypeScript compiles:
   ```bash
   bun typecheck
   ```
4. If a stop hook fails (e.g., `validate-tests-pass.ts`), check that the project's test command is correct

---

### Tests Fail After Builder Implementation

**Symptoms**: Builder reports completion but `bun test` fails.

**Cause**: Builder did not run tests, or introduced a regression.

**Solution**:
1. Run error-analyzer on the test output:
   ```
   Task(subagent_type="error-analyzer", prompt="Test failures: <paste output>")
   ```
2. Re-delegate to builder with specific fix instructions
3. After fix, verify: `bun test ./.claude/hooks/`
4. Never report "completed" without passing tests

---

### Skill Does Not Load

**Symptoms**: Agent operates without expected domain context.

**Cause**: Keywords in prompt do not match the skill-matching table.

**Solution**:
1. Check `.claude/rules/skill-matching.md` for the keyword-to-skill mapping
2. Ensure the prompt contains at least one trigger keyword for the desired skill
3. Skills can also be loaded manually:
   ```
   Skill(skill="api-design")
   ```
4. Maximum 3 skills per delegation; if more match, highest-frequency keywords win

---

### Agent Not Recognized

**Symptoms**: `Task(subagent_type="agent-name")` fails with unknown agent.

**Cause**: Agent file missing `description` field in YAML frontmatter.

**Solution**:
1. Check the agent file in `.claude/agents/<agent-name>.md`
2. Verify frontmatter has a `description` field:
   ```yaml
   ---
   name: agent-name
   description: |
     Agent purpose description.
     Use proactively when: <triggers>.
     Keywords - keyword1, keyword2
   ---
   ```
3. Without `description`, Claude Code does not register the agent as a valid `subagent_type`
4. Use `disallowedTools` (camelCase), not `disallowed_tools` (snake_case)

---

### Complexity Routing Mismatch

**Symptoms**: Simple task gets over-planned, or complex task goes straight to builder without planning.

**Cause**: Complexity score miscalculated.

**Solution**:
1. Review `.claude/rules/complexity-routing.md` for scoring factors
2. Each factor (files, domains, dependencies, security, integrations) has weight 20%
3. Score < 30 = builder direct, 30-60 = planner optional, > 60 = planner mandatory
4. If unsure, default to including a planner step

---

### Prompt Scored Below 70

**Symptoms**: Lead triggers `prompt-engineer` skill instead of proceeding.

**Cause**: User prompt is too vague or missing required context.

**Solution**:
1. This is expected behavior per `.claude/rules/prompt-scoring.md`
2. Improve the prompt with:
   - Specific action verb + target
   - File paths and technology context
   - Clear success criteria
3. Example of a strong prompt:
   ```
   Add validation to the stop hook validate-tests-pass.ts
   that checks for test file existence before running bun test.
   Success: hook skips gracefully when no test files found.
   ```

---

### Parallel Delegation Not Used

**Symptoms**: Lead sends agents sequentially when they could run in parallel.

**Cause**: Lead not following parallelization rules.

**Solution**:
1. Review `.claude/rules/lead-orchestrator.md` parallelization section
2. Independent tasks MUST be dispatched in the same message:
   ```
   Task(scout, "find auth files") + Task(scout, "find config files")
   ```
3. Only wait sequentially when there is a data dependency
4. Target: >80% parallel efficiency score

---

## Debug Commands

```bash
# Run all hook tests
bun test ./.claude/hooks/

# Type check hooks
bun typecheck

# List all agents
ls .claude/agents/

# List all skills
ls .claude/skills/

# Check agent frontmatter
head -15 .claude/agents/<agent-name>.md

# Verify skill keywords
grep -i "keywords" .claude/rules/skill-matching.md
```

## Common Bun Test Issues

### mock.module Leaks Across Test Files

**Cause**: `mock.module` in Bun 1.3.x is global and persistent across all test files in a batch run.

**Solution**:
- Prefer `spyOn(singleton, 'method')` instead of `mock.module`
- When `mock.module` is needed, include ALL exports the real module has
- Always add `afterAll(() => { spy.mockRestore() })` to restore spies
- `mock.module` has no `restore()` -- once set, it stays for the process lifetime

### Test Path Requires `./` Prefix

**Cause**: Bun requires explicit `./` prefix for dotfile directories.

**Solution**:
```bash
# WRONG
bun test .claude/hooks/

# CORRECT
bun test ./.claude/hooks/
```

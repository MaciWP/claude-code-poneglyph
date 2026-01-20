# Orchestrator Capabilities: The Senior Tech Lead

> "I don't just write code; I ensure it's worth writing."

To meet the goal of **"Quality Code & High Performance"**, the Orchestrator is configured to act as a rigorous Gatekeeper.

## 1. Capability: The "Iron-Clad" Review (Quality)
**Goal:** Prevent technical debt before it merges.

The Orchestrator automatically routes any code generation task through the **Reviewer Expert** before showing it to you.
*   **Static Analysis:** Enforces strict TypeScript strictness.
*   **Pattern Enforcement:** Rejects code that ignores established patterns (e.g., "Always use `zod` for validation").
*   **Simplicity Check:** Rejects "Creative" solutions when a simple one exists.
*   **Documentation:** Demands JSDoc for every public function.

**Workflow:** `Plan` -> `Draft` -> `Review (Loop)` -> `Final Code`

## 2. Capability: The Performance Budget (Performance)
**Goal:** Code that runs fast and scales.

The Orchestrator has a "Performance First" directive:
*   **Big-O Analysis:** The agent theoretically analyzes the complexity of algorithms before implementation.
*   **Bundle Phobia:** Checks import costs. Preventing you from importing `lodash` when you only need `debounce`.
*   **Re-render Guard:** In React tasks, it specifically looks for unnecessary hooks or prop drilling.

## 3. Capability: The "Refactor" Mode
**Goal:** Improve existing code without breaking it.

*   You can point the Orchestrator to a file and say: *"Make this cleaner"* or *"Optimize this"*.
*   It operates safely using **Git Worktrees** (as per Plan P1b) so your main branch is never broken during experimentation.

---

## Usage Examples

| Goal | Command | What happens |
|------|---------|--------------|
| **Quality** | `/review src/components/Sidebar.tsx` | Run a Senior Dev review on this file. |
| **Performance** | `/optimize server/routes/api.ts` | Profile query complexity and suggest caching. |
| **Security** | `/audit` | Look for OWASP top 10 vulnerabilities. |

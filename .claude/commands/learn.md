---
description: "Record a lesson for the self-improvement loop. Usage: /learn <lesson text>"
argument-hint: "<lesson to remember>"
---

# Record Lesson

The user wants to record this lesson for future sessions: **$ARGUMENTS**

## Instructions

If `$ARGUMENTS` is empty, ask the user what lesson they want to record and abort.

Otherwise, persist the lesson as an auto-memory entry following the format defined in `C:/Users/Maci/.claude/CLAUDE.md` (section "auto memory"):

1. **Choose the memory type** (`user`, `feedback`, `project`, or `reference`) based on the content of `$ARGUMENTS`. Default to `feedback` if it's a behavioral rule/correction; default to `project` if it's a state/decision; default to `user` if it's about the user; default to `reference` if it's a pointer to an external system.

2. **Write a new file** in `C:/Users/Maci/.claude/projects/D--PYTHON-claude-code-poneglyph/memory/<short-kebab-slug>.md` with this frontmatter:
   ```
   ---
   name: <short-kebab-slug>
   description: <one-line summary distilled from the lesson>
   metadata:
     type: <chosen type>
   ---

   <lesson body — for feedback/project types, structure as: rule/fact, then **Why:** and **How to apply:** lines>
   ```

3. **Update the index** `C:/Users/Maci/.claude/projects/D--PYTHON-claude-code-poneglyph/memory/MEMORY.md`: add a one-line entry under the most relevant section: `- [<Title>](<slug>.md) — <one-line hook>`.

4. Confirm to the user: "Lesson saved as `<slug>.md` (type: <type>). Will surface in future sessions via auto-memory."

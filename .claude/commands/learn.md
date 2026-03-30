---
description: "Record a lesson for the self-improvement loop. Usage: /learn <lesson text>"
argument-hint: "<lesson to remember>"
---

# Record Lesson

The user wants to record the following lesson for future reference:

**Lesson**: $ARGUMENTS

## Instructions

1. Parse the lesson text from the arguments
2. Run this command to record it:

```bash
bun -e "
const { recordLesson } = require('./.claude/hooks/lib/lessons-recorder');
recordLesson({
  context: 'User-provided via /learn command',
  correction: '',
  lesson: process.argv[1],
  skill: undefined
});
console.log('Lesson recorded successfully.');
" "$ARGUMENTS"
```

3. Confirm to the user that the lesson was saved
4. Mention it will be surfaced in future sessions via memory-inject

If $ARGUMENTS is empty, ask the user what lesson they want to record.

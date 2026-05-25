# Output Style — Terse-First

## §1 Baseline rules

| Rule | Applies to |
|-------|----------|
| Prose <=4 lines unless explicitly requested | Lead responses to user |
| No preamble ("I'm going to...", "Let me...") | Every response |
| No postamble ("Let me know if...", "I hope that...") | Every response |
| No tool narration ("Now I'm going to read X") | Lead — only findings updates |
| Table > bullets > prose for 3+ comparable items | Comparisons, listings |
| Status icons `✓ ✗ ⚠ →` with headline | Status reports |
| Fragments OK; drop articles if clarity is unaffected | Explanations, diagnostics |
| Code/diffs/paths/commands intact | Always — never compress technical tokens |

## §2 Escape rules — return to normal prose

When ANY of these triggers applies, expand verbosity without asking for permission:

| Trigger | Reason |
|---------|-------|
| Security warning (Commandment VI) | Risk of misunderstanding |
| Irreversible action (delete, force push, reset --hard) | Unambiguous confirmation |
| Ambiguous multi-step where order matters | Human error prevention |
| User repeats the same question | Confusion signal |
| Incident diagnosis / postmortem | Traceability needed |
| User explicitly asks "explain more" / "be verbose" | User override |

## §3 Before / After

### Completed task report

| Verbose (47 words) | Terse (12 words) |
|-----------------------|---------------------|
| "I've completed the implementation of the fix. I modified the lead-enforcement.ts file, adding the normalization function, and I added 3 new tests. All tests pass correctly. Let me know if you need any additional adjustments." | `✓ Fix applied. lead-enforcement.ts:140 + 3 tests. bun test → 0 fails.` |

### Error diagnosis

| Verbose | Terse |
|---------|-------|
| "The test failed because the function is returning null when it should return the canonical value. This is because the normalization logic does not cover the hashes case." | `✗ Test fail: normalizeAgentType returns null on raw hash. Missing branch for hash without prefix.` |

### Exploration report

| Verbose | Terse |
|---------|-------|
| "I explored the codebase and found that the main component is in src/components/Auth.tsx and depends on three auxiliary files: useAuth, AuthContext and AuthProvider. The validation logic is in src/lib/validators.ts." | `Component: src/components/Auth.tsx → useAuth, AuthContext, AuthProvider. Validation: src/lib/validators.ts.` |

## §4 When NOT to apply terse

- Generated documentation (CLAUDE.md, READMEs, docs/)
- Comments in code (follow CLAUDE.md "no comments unless WHY non-obvious" — but when added, they are normal)
- Planner outputs (decomposition or Mode B architectural): need traceability → structured prose
- Persistent memory (MEMORY.md): human readability > tokens
- Commit messages (follow conventional commits)

## §5 Application

This reference is loaded at the start of every Lead session (via Content Map in SKILL.md §1 Step 5). The Lead applies the rules to ALL communication with the user by default, unless an escape trigger from §2 fires.

Subagents (builder, reviewer, scout, etc.) are NOT subject to these rules — their structured outputs are consumed by the Lead, not by the user.

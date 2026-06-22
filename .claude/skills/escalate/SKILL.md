---
name: escalate
description: |
  Escalation step when a problem is NOT getting solved — you are stuck, looping on
  the same error, or a goal-loop keeps returning the same "not met" reason. Runs at
  effort: xhigh (the project's deliberate "low by default, escalate only when it pays"
  model) and forces a DIFFERENT attack than the one already failing. It does NOT
  re-implement diagnosis — it orchestrates `diagnostic-patterns` + `drillme` with deep
  reasoning, then hands back to STOP→AskUserQuestion if still unsolved.
  Use when: stuck, same error twice, 2+ diagnoses without a fix, a goal-loop not
  converging, "no se soluciona", "estoy atascado", "desatasca esto", "llevamos rato
  con esto", repeated failed attempts.
  Keywords - escalate, stuck, atascado, desatascar, no se soluciona, loop, bucle,
  same error, no progress, deep reasoning, xhigh, last resort, unblock
disable-model-invocation: false
effort: xhigh
---

# Escalate — stuck-buster (xhigh)

The escalation rung between "stuck detected" and "give up / ask the user". Its only
reason to exist: **raise effort to xhigh and change the attack** when repetition at the
base effort isn't working. It is deliberately THIN — it does not own diagnostic content;
it borrows it.

## When this fires

Invoke when `error-recovery` stuck-detection trips, or any equivalent loop:

| Signal | Source |
|---|---|
| Same exact error twice | `error-recovery.md` §Stuck Detection |
| 2+ diagnoses without a working fix | `error-recovery.md` |
| A `/goal` loop returning the same "not met" reason repeatedly | the loops playbook |
| User says "stuck / no se soluciona / desatasca" | direct |

Do NOT fire on a first failure — that's ordinary `diagnostic-patterns` territory at base effort.

## Protocol (the only owned content)

1. **Name what already failed.** State the technique(s) and assumptions already tried. The loop persists because the same attack repeats.
2. **Attack the CLASS, not the instance.** Generalize from the concrete failing case to the category of input/state causing it — fix the class so the symptom can't recur elsewhere (`[[feedback-fix-class-not-instance]]`).
3. **Switch technique, don't repeat.** Load and apply a method you have NOT used yet:
   - `Skill('diagnostic-patterns')` — 5 Whys, stack-trace classification, retry/recovery
   - `Skill('drillme')` — inversion / first-principles to surface a wrong assumption
   - Re-read the primary source (file/spec/docs) rather than reasoning from memory
4. **One deep xhigh pass.** This skill already runs at xhigh; spend it on the new attack, not a louder version of the old one.
5. **Hand back.** If solved → report the root cause + fix. If still unsolved after the xhigh pass → STOP → `AskUserQuestion` with: what was tried, why each failed, and the 2-3 viable next options (`error-recovery.md` §Stuck Detection).

## Anti-pattern (kills this skill if violated — Commandment X)

If it starts copying the `diagnostic-patterns` catalog, it is redundant and must die. Its
body is trigger + change-of-technique + handback, nothing more. The diagnosis lives in
`diagnostic-patterns`; the judgment in `critic`; this is only the escalation rung.

## Related
- `.claude/rules/error-recovery.md` — stuck-detection thresholds that trigger this
- `diagnostic-patterns` / `drillme` — the techniques this orchestrates
- `skills/orchestrator-protocol/references/09-loops-playbook.md` — escalation inside a goal-loop

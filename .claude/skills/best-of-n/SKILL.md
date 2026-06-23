---
name: best-of-n
description: |
  Patrón best-of-N verificado (piloto, feature 019): corre 2-3 variantes headless (`claude -p --worktree`) sobre UNA tarea difícil y testeable, selecciona por la suite de tests del proyecto, limpia los worktrees y registra el resultado.
  La elegibilidad es un GATE: solo tareas difíciles (alta probabilidad de fallo en un intento) CON check ejecutable. Invocación manual por tarea, nunca por defecto.
  Úsala cuando: tarea difícil con suite ejecutable, un solo intento probablemente falle, "best-of-n", "varios intentos", "intentos paralelos", "genera variantes".
  Keywords - best-of-n, variants, attempts, worktree, parallel attempts,
  intentos, variantes, hard task, test-selected, sampling
disable-model-invocation: false
argument-hint: "\"<task prompt>\" [--n 2|3]"
when_to_use: |
  "varios intentos", "genera variantes", "intentos paralelos", "best of n", "try several solutions", "parallel attempts on a hard task"
---

# best-of-n (pilot)

Named DIY pattern: N independent attempts at one hard task, **test suite selects**. Every constraint below is locked by evidence (018 `decision-memo-W1.md` D1); every use MUST log its outcome — this pilot generates the evidence the field lacks (no published N=2-5 test-selection data, W1 declared gap).

## Eligibility gate (BOTH required — else do NOT use)

| Condition | Why |
|---|---|
| **Hard task** — high expected single-attempt failure (novel domain, prior failed attempt, subtle constraint interplay) | Cheap attempts are the enabling condition; on easy tasks N×cost buys nothing (W1 D1: only measured solo run had 75% wasted attempts) |
| **Runnable check** — a test suite / typecheck / deterministic script that distinguishes green from red | SWE-bench-style gains exist BECAUSE tests verify (W1 D1); without a check, selection degrades to vibes |

Anti-triggers: easy/mechanical tasks; doc-only changes; tasks whose verification is subjective (no runnable oracle); any attempt to make this a default execution mode (out-of-scope by spec 019).

## Constraints (locked — W1 D1)

- **N = 2-3, never more** — selection plateaus (verifier gap); more attempts waste tokens.
- **NO LLM-judge selector** — ever. Suite selects; human diff-review breaks multi-green ties (Cursor 2.2's judge already draws "manual combination beats it" reports).
- **Cleanup is part of the pattern** — `-p` worktrees leak; explicit removal step below.
- **Log or it didn't happen** — a use without a log row is a protocol violation (the pilot's whole point is novel evidence).

## Workflow

1. **Gate check** — confirm both eligibility conditions; name the runnable check command.
2. **Launch N variants** (same prompt, independent worktrees), in background:

```bash
claude -p "<task prompt>" --worktree bon-a &
claude -p "<task prompt>" --worktree bon-b &
# optional third: --worktree bon-c
wait
```

3. **Select by suite** — in each worktree run the project check (e.g. `bun test ./.claude/hooks/`):
   - exactly one green → it wins;
   - multiple green → human diff-review picks (or combines manually);
   - zero green → record the loss; fix forward inline (do not re-roll blindly).
4. **Merge the winner** — apply the winning diff to the working branch (cherry-pick or `git diff | git apply`).
5. **Cleanup (mandatory)**:

```bash
git worktree list                 # locate bon-* paths
git worktree remove <path> --force
git branch -D <bon-branch>        # if a branch was created
```

6. **Log the outcome** — append one row to `.claude/learned/best-of-n-log.md` (schema there). Include token/cost estimate and an honest win-vs-single-attempt judgment.

## Smell signals

- ⚠️ Used on a task that a single attempt would likely solve → gate ignored; log it as such (the log must capture misuse too).
- ⚠️ Log empty after 3+ eligible hard tasks → pattern is shelf-ware; surface at next retro (promote, fix, or cut).
- ⚠️ Tempted to add an LLM judge for multi-green ties → forbidden (W1 D1); human diff-review is the tiebreak.
- ⚠️ `git worktree list` shows stale `bon-*` entries → cleanup step skipped; remove before next use.

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Eligibility gate keeps the expensive pattern off easy tasks |
| IV | Selection is test-suite-driven — verification, not vibes |
| VII | N independent attempts run in parallel (background `&` + `wait`) |
| IX | Mandatory logging generates the novel evidence 018 declared missing |

## Related

- `.claude/learned/best-of-n-log.md` — outcome log (append per use).
- `.claude/plans/018-evidence-roadmap/decision-memo-W1.md` D1 — evidence basis.
- `orchestrator-protocol` — this pattern is N headless processes, not subagents; the spawn decision tree does not apply.
